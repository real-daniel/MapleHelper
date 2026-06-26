package app.maplehelper.equipment;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.MediaType;
import org.springframework.http.codec.multipart.FilePart;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeType;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.concurrent.TimeUnit;

@Service
public class EquipmentService {

    private static final long MAX_UPLOAD_BYTES = 8L * 1024L * 1024L;
    private static final int OCR_TIMEOUT_SECONDS = 20;

    private final EquipmentItemRepository repository;
    private final String tesseractCommand;
    private final String pythonCommand;
    private final String starCounterScript;
    private final ObjectMapper objectMapper;
    private final EquipmentTextParser textParser;

    public EquipmentService(
            EquipmentItemRepository repository,
            @Value("${maplehelper.ocr.tesseract-command:tesseract}") String tesseractCommand,
            @Value("${maplehelper.cv.python-command:python}") String pythonCommand,
            @Value("${maplehelper.cv.star-counter-script:scripts/count_starforce.py}") String starCounterScript,
            ObjectMapper objectMapper,
            EquipmentTextParser textParser) {
        this.repository = repository;
        this.tesseractCommand = tesseractCommand;
        this.pythonCommand = pythonCommand;
        this.starCounterScript = starCounterScript;
        this.objectMapper = objectMapper;
        this.textParser = textParser;
    }

    public Mono<EquipmentExtractionDraft> extractDraft(FilePart file) {
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
                                .subscribeOn(Schedulers.boundedElastic())
                                .map(extraction -> {
                                    ParsedEquipmentText parsed = textParser.parse(extraction.ocr().text(), extraction.starForce());
                                    return new EquipmentExtractionDraft(
                                            file.filename(),
                                            byteCount,
                                            parsed.slot(),
                                            parsed.name(),
                                            parsed.levelRequirement(),
                                            parsed.starForce(),
                                            parsed.statLines(),
                                            parsed.potentialTier(),
                                            parsed.potentialLines(),
                                            parsed.bonusPotentialTier(),
                                            parsed.bonusPotentialLines(),
                                            extraction.ocr().text(),
                                            extraction.status(),
                                            extraction.notes());
                                });
                    } catch (Exception exception) {
                        DataBufferUtils.release(dataBuffer);
                        return Mono.error(exception);
                    }
                });
    }

    private ImageExtractionResult extractImageData(byte[] imageBytes, String suffix) {
        OcrResult ocr = runOcr(imageBytes, suffix);
        StarForceResult starForce = countStarForce(imageBytes, suffix);
        String status = ocr.status() + "+" + starForce.status();
        String notes = ocr.notes() + " " + starForce.notes();
        return new ImageExtractionResult(ocr, starForce.starForce(), status, notes);
    }

    public Mono<EquipmentItem> confirm(ConfirmEquipmentRequest request) {
        Instant now = Instant.now();
        return repository.save(new EquipmentItem(
                null,
                request.characterProfileId(),
                request.slot(),
                request.name().trim(),
                request.levelRequirement(),
                request.starForce(),
                clean(request.statLines()),
                clean(request.potentialTier()),
                clean(request.potentialLines()),
                clean(request.bonusPotentialTier()),
                clean(request.bonusPotentialLines()),
                clean(request.rawExtractedText()),
                now,
                now));
    }

    public Flux<EquipmentItem> findAll(Long characterProfileId) {
        if (characterProfileId == null) {
            return repository.findAllByOrderByUpdatedAtDesc();
        }

        return repository.findAllByCharacterProfileIdOrderByUpdatedAtDesc(characterProfileId);
    }

    public Mono<Void> delete(Long id) {
        return repository.deleteById(id);
    }

    private OcrResult runOcr(byte[] imageBytes, String suffix) {
        Path inputFile = null;
        Path outputFile = null;
        try {
            inputFile = Files.createTempFile("maplehelper-equipment-", suffix);
            outputFile = Files.createTempFile("maplehelper-equipment-ocr-", ".txt");
            Files.write(inputFile, imageBytes);

            Process process = new ProcessBuilder(tesseractCommand, inputFile.toString(), "stdout", "--psm", "6")
                    .redirectErrorStream(true)
                    .redirectOutput(outputFile.toFile())
                    .start();

            if (!process.waitFor(OCR_TIMEOUT_SECONDS, TimeUnit.SECONDS)) {
                process.destroyForcibly();
                return new OcrResult(
                        "",
                        "OCR_TIMED_OUT",
                        "OCR timed out after " + OCR_TIMEOUT_SECONDS + " seconds. You can still fill the review fields manually.");
            }

            String output = Files.readString(outputFile, StandardCharsets.UTF_8).trim();

            if (process.exitValue() != 0) {
                return new OcrResult(
                        "",
                        "OCR_FAILED",
                        "OCR command failed. Tesseract output: " + output);
            }

            if (output.isBlank()) {
                return new OcrResult(
                        "",
                        "OCR_COMPLETED_EMPTY",
                        "OCR completed, but no text was detected. You can still fill the review fields manually.");
            }

            return new OcrResult(
                    output,
                    "OCR_COMPLETED",
                    "OCR completed. Review the extracted raw text before confirm-saving.");
        } catch (IOException exception) {
            return new OcrResult(
                    "",
                    "OCR_UNAVAILABLE",
                    "Tesseract OCR is not installed or not configured. Set maplehelper.ocr.tesseract-command or install tesseract on PATH.");
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return new OcrResult(
                    "",
                    "OCR_INTERRUPTED",
                    "OCR was interrupted. You can still fill the review fields manually.");
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

    private StarForceResult countStarForce(byte[] imageBytes, String suffix) {
        Path inputFile = null;
        Path outputFile = null;
        try {
            inputFile = Files.createTempFile("maplehelper-starforce-", suffix);
            outputFile = Files.createTempFile("maplehelper-starforce-output-", ".json");
            Files.write(inputFile, imageBytes);

            Process process = new ProcessBuilder(pythonCommand, starCounterScript, inputFile.toString())
                    .redirectErrorStream(true)
                    .redirectOutput(outputFile.toFile())
                    .start();

            if (!process.waitFor(OCR_TIMEOUT_SECONDS, TimeUnit.SECONDS)) {
                process.destroyForcibly();
                return new StarForceResult(null, "STARFORCE_TIMED_OUT", "Star counter timed out.");
            }

            String output = Files.readString(outputFile, StandardCharsets.UTF_8).trim();
            if (process.exitValue() != 0) {
                return new StarForceResult(null, "STARFORCE_FAILED", "Star counter failed: " + output);
            }

            StarCounterOutput parsed = objectMapper.readValue(output, StarCounterOutput.class);
            Integer starForce = parsed.starForce() == null || parsed.starForce() <= 0 ? null : parsed.starForce();
            String notes = starForce == null
                    ? "Star counter did not find filled stars."
                    : "Star counter detected " + starForce + " filled stars.";
            return new StarForceResult(starForce, "STARFORCE_COMPLETED", notes);
        } catch (IOException exception) {
            return new StarForceResult(
                    null,
                    "STARFORCE_UNAVAILABLE",
                    "Star counter unavailable. Ensure Python, Pillow, and NumPy are installed and maplehelper.cv.star-counter-script is correct.");
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return new StarForceResult(null, "STARFORCE_INTERRUPTED", "Star counter was interrupted.");
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

    private String clean(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    private record OcrResult(String text, String status, String notes) {
    }

    private record StarForceResult(Integer starForce, String status, String notes) {
    }

    private record ImageExtractionResult(OcrResult ocr, Integer starForce, String status, String notes) {
    }

    private record StarCounterOutput(Integer starForce, Double confidence, Integer candidates, Integer components, String error) {
    }
}
