package app.maplehelper.stat;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.MediaType;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeType;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
public class CharacterStatEquivalencyService {

    private static final long MAX_UPLOAD_BYTES = 8L * 1024L * 1024L;
    private static final int OCR_TIMEOUT_SECONDS = 20;

    private final String tesseractCommand;
    private final String pythonCommand;
    private final String statEquivalencyExtractorScript;
    private final ObjectMapper objectMapper;

    public CharacterStatEquivalencyService(
            @Value("${maplehelper.ocr.tesseract-command:tesseract}") String tesseractCommand,
            @Value("${maplehelper.cv.python-command:python}") String pythonCommand,
            @Value("${maplehelper.cv.stat-equivalency-extractor-script:scripts/extract_stat_equivalencies.py}") String statEquivalencyExtractorScript,
            ObjectMapper objectMapper) {
        this.tesseractCommand = tesseractCommand;
        this.pythonCommand = pythonCommand;
        this.statEquivalencyExtractorScript = statEquivalencyExtractorScript;
        this.objectMapper = objectMapper;
    }

    public Mono<CharacterStatEquivalencyExtraction> extract(FilePart file) {
        MediaType contentType = file.headers().getContentType();
        if (!isSupportedImage(contentType)) {
            return Mono.error(new IllegalArgumentException("Upload must be a PNG, JPEG, or WEBP image."));
        }

        return DataBufferUtils.join(file.content())
                .flatMap(dataBuffer -> {
                    try {
                        int byteCount = dataBuffer.readableByteCount();
                        if (byteCount > MAX_UPLOAD_BYTES) {
                            DataBufferUtils.release(dataBuffer);
                            return Mono.error(new IllegalArgumentException("Image must be 8 MB or smaller."));
                        }

                        byte[] imageBytes = new byte[byteCount];
                        dataBuffer.read(imageBytes);
                        DataBufferUtils.release(dataBuffer);

                        return Mono.fromCallable(() -> extractImageData(imageBytes, suffixFor(contentType)))
                                .subscribeOn(Schedulers.boundedElastic());
                    } catch (Exception exception) {
                        DataBufferUtils.release(dataBuffer);
                        return Mono.error(exception);
                    }
                });
    }

    private CharacterStatEquivalencyExtraction extractImageData(byte[] imageBytes, String suffix) {
        Path inputFile = null;
        Path outputFile = null;
        try {
            inputFile = Files.createTempFile("maplehelper-stat-equivalencies-", suffix);
            outputFile = Files.createTempFile("maplehelper-stat-equivalencies-output-", ".json");
            Files.write(inputFile, imageBytes);

            Process process = new ProcessBuilder(pythonCommand, statEquivalencyExtractorScript, inputFile.toString(), tesseractCommand)
                    .redirectErrorStream(true)
                    .redirectOutput(outputFile.toFile())
                    .start();

            if (!process.waitFor(OCR_TIMEOUT_SECONDS, TimeUnit.SECONDS)) {
                process.destroyForcibly();
                return failed("STAT_EQUIVALENCIES_TIMED_OUT", "Stat equivalency OCR timed out.");
            }

            String output = Files.readString(outputFile, StandardCharsets.UTF_8).trim();
            if (process.exitValue() != 0) {
                return failed("STAT_EQUIVALENCIES_FAILED", "Stat equivalency OCR failed: " + output);
            }

            StatEquivalencyExtractorOutput parsed = objectMapper.readValue(output, StatEquivalencyExtractorOutput.class);
            List<CharacterStatEquivalency> equivalencies = parsed.equivalencies() == null ? List.of() : parsed.equivalencies();
            String notes = equivalencies.isEmpty()
                    ? "Stat equivalency OCR did not find table rows."
                    : "Stat equivalency OCR found " + equivalencies.size() + " table row(s).";
            return new CharacterStatEquivalencyExtraction(
                    equivalencies,
                    parsed.lines() == null ? "" : parsed.lines().trim(),
                    parsed.rawText() == null ? "" : parsed.rawText().trim(),
                    "STAT_EQUIVALENCIES_COMPLETED",
                    notes);
        } catch (IOException exception) {
            return failed(
                    "STAT_EQUIVALENCIES_UNAVAILABLE",
                    "Stat equivalency OCR unavailable. Ensure Python, Pillow, NumPy, Tesseract, and maplehelper.cv.stat-equivalency-extractor-script are configured.");
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return failed("STAT_EQUIVALENCIES_INTERRUPTED", "Stat equivalency OCR was interrupted.");
        } finally {
            if (inputFile != null) {
                try {
                    Files.deleteIfExists(inputFile);
                } catch (IOException ignored) {
                    // Temporary files are best-effort cleanup.
                }
            }
            if (outputFile != null) {
                try {
                    Files.deleteIfExists(outputFile);
                } catch (IOException ignored) {
                    // Temporary files are best-effort cleanup.
                }
            }
        }
    }

    private CharacterStatEquivalencyExtraction failed(String status, String notes) {
        return new CharacterStatEquivalencyExtraction(List.of(), "", "", status, notes);
    }

    private String suffixFor(MediaType contentType) {
        if (MediaType.IMAGE_JPEG.isCompatibleWith(contentType)) {
            return ".jpg";
        }

        if (MimeType.valueOf("image/webp").isCompatibleWith(contentType)) {
            return ".webp";
        }

        return ".png";
    }

    private boolean isSupportedImage(MediaType contentType) {
        if (contentType == null) {
            return false;
        }

        return MediaType.IMAGE_PNG.isCompatibleWith(contentType)
                || MediaType.IMAGE_JPEG.isCompatibleWith(contentType)
                || MimeType.valueOf("image/webp").isCompatibleWith(contentType);
    }

    private record StatEquivalencyExtractorOutput(
            List<CharacterStatEquivalency> equivalencies,
            String lines,
            String rawText,
            String error
    ) {
    }
}
