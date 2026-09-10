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
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.stream.IntStream;
import java.util.stream.Collectors;

@Service
public class EquipmentService {

    private static final long MAX_UPLOAD_BYTES = 8L * 1024L * 1024L;
    private static final int OCR_TIMEOUT_SECONDS = 20;

    private final EquipmentItemRepository repository;
    private final EquipmentCatalogItemRepository catalogRepository;
    private final String tesseractCommand;
    private final String pythonCommand;
    private final String starCounterScript;
    private final String flameExtractorScript;
    private final String equipmentOcrPreprocessorScript;
    private final ObjectMapper objectMapper;
    private final EquipmentTextParser textParser;
    private final EquipmentFlameCalculator flameCalculator;

    public EquipmentService(
            EquipmentItemRepository repository,
            EquipmentCatalogItemRepository catalogRepository,
            @Value("${maplehelper.ocr.tesseract-command:tesseract}") String tesseractCommand,
            @Value("${maplehelper.cv.python-command:python}") String pythonCommand,
            @Value("${maplehelper.cv.star-counter-script:scripts/count_starforce.py}") String starCounterScript,
            @Value("${maplehelper.cv.flame-extractor-script:scripts/extract_flame_stats.py}") String flameExtractorScript,
            @Value("${maplehelper.cv.equipment-ocr-preprocessor-script:scripts/preprocess_equipment_ocr.py}") String equipmentOcrPreprocessorScript,
            ObjectMapper objectMapper,
            EquipmentTextParser textParser,
            EquipmentFlameCalculator flameCalculator) {
        this.repository = repository;
        this.catalogRepository = catalogRepository;
        this.tesseractCommand = tesseractCommand;
        this.pythonCommand = pythonCommand;
        this.starCounterScript = starCounterScript;
        this.flameExtractorScript = flameExtractorScript;
        this.equipmentOcrPreprocessorScript = equipmentOcrPreprocessorScript;
        this.objectMapper = objectMapper;
        this.textParser = textParser;
        this.flameCalculator = flameCalculator;
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
                                    boolean skipFlames = extraction.flameSearchSkipped()
                                            || SkillRingDetector.isSkillRing(parsed.name())
                                            || SkillRingDetector.isSkillRingText(extraction.ocr().text())
                                            || isSweetwaterItem(parsed.name());
                                    boolean skipPotential = extraction.potentialSkipped()
                                            || SkillRingDetector.isSkillRing(parsed.name())
                                            || SkillRingDetector.isSkillRingText(extraction.ocr().text())
                                            || parsed.slot() == EquipmentSlot.POCKET;
                                    String flameStats = skipFlames ? "" : preferredFlameStats(parsed, extraction.flameStats());
                                    ParsedEquipmentText flameParsed = withFlameStats(parsed, flameStats);
                                    String flameScoreLines = skipFlames
                                            ? ""
                                            : flameCalculator.deriveFlameScoreLines(flameParsed);
                                    return new EquipmentExtractionDraft(
                                            file.filename(),
                                            byteCount,
                                            parsed.slot(),
                                            null,
                                            parsed.name(),
                                            parsed.levelRequirement(),
                                            extraction.starSearchSkipped() ? 0 : parsed.starForce(),
                                            parsed.statLines(),
                                            flameStats,
                                            flameScoreLines,
                                            skipPotential ? "" : parsed.potentialTier(),
                                            skipPotential ? "" : parsed.potentialLines(),
                                            skipPotential ? "" : parsed.bonusPotentialTier(),
                                            skipPotential ? "" : parsed.bonusPotentialLines(),
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
        ParsedEquipmentText ocrParsed = textParser.parse(ocr.text(), null);
        if (SkillRingDetector.isSkillRing(ocrParsed.name()) || SkillRingDetector.isSkillRingText(ocr.text())) {
            String status = ocr.status() + "+STARFORCE_SKIPPED+FLAMES_SKIPPED+POTENTIAL_SKIPPED";
            String notes = ocr.notes() + " Detected a skill/Oz ring, so star, flame, and potential extraction were skipped.";
            return new ImageExtractionResult(ocr, 0, "", status, notes, true, true, true);
        }

        if (ocrParsed.slot() == EquipmentSlot.POCKET) {
            FlameExtractionResult flameStats = extractFlameStats(imageBytes, suffix);
            String status = ocr.status() + "+STARFORCE_SKIPPED+" + flameStats.status() + "+POTENTIAL_SKIPPED";
            String notes = ocr.notes() + " Detected a pocket item, so star and potential extraction were skipped. " + flameStats.notes();
            return new ImageExtractionResult(ocr, 0, flameStats.flameStats(), status, notes, true, false, true);
        }

        StarForceResult starForce = countStarForce(imageBytes, suffix);
        if (isSweetwaterItem(ocrParsed.name())) {
            String status = ocr.status() + "+" + starForce.status() + "+FLAMES_SKIPPED";
            String notes = ocr.notes() + " " + starForce.notes() + " Detected a Sweetwater item, so flame extraction was skipped.";
            return new ImageExtractionResult(ocr, starForce.starForce(), "", status, notes, false, true, false);
        }

        FlameExtractionResult flameStats = extractFlameStats(imageBytes, suffix);
        String status = ocr.status() + "+" + starForce.status() + "+" + flameStats.status();
        String notes = ocr.notes() + " " + starForce.notes() + " " + flameStats.notes();
        return new ImageExtractionResult(ocr, starForce.starForce(), flameStats.flameStats(), status, notes, false, false, false);
    }

    String preferredFlameStats(ParsedEquipmentText parsed, String extractedFlameStats) {
        if (parsed.slot() == EquipmentSlot.WEAPON) {
            return firstNonBlank(
                    extractedFlameStats,
                    flameCalculator.deriveFlameStats(parsed),
                    parsed.flameStats());
        }

        return firstNonBlank(
                flameCalculator.deriveFlameStats(parsed),
                extractedFlameStats,
                parsed.flameStats());
    }

    private ParsedEquipmentText withFlameStats(ParsedEquipmentText parsed, String flameStats) {
        return new ParsedEquipmentText(
                parsed.slot(),
                parsed.name(),
                parsed.levelRequirement(),
                parsed.starForce(),
                parsed.statLines(),
                flameStats,
                parsed.potentialTier(),
                parsed.potentialLines(),
                parsed.bonusPotentialTier(),
                parsed.bonusPotentialLines());
    }

    static boolean isSweetwaterItem(String name) {
        return name != null && name.toLowerCase(java.util.Locale.ROOT).contains("sweetwater");
    }

    public Mono<EquipmentItem> confirm(ConfirmEquipmentRequest request) {
        Instant now = Instant.now();
        return resolveSaveSlot(request)
                .flatMap(resolvedSlot -> deleteExistingSlot(request.characterProfileId(), resolvedSlot.slot(), resolvedSlot.slotIndex())
                        .then(repository.save(new EquipmentItem(
                                null,
                                request.characterProfileId(),
                                resolvedSlot.slot(),
                                resolvedSlot.slotIndex(),
                                request.name().trim(),
                                request.levelRequirement(),
                                request.starForce(),
                                clean(request.statLines()),
                                clean(request.flameStats()),
                                clean(request.flameScoreLines()),
                                clean(request.potentialTier()),
                                clean(request.potentialLines()),
                                clean(request.bonusPotentialTier()),
                                clean(request.bonusPotentialLines()),
                                clean(request.rawExtractedText()),
                                now,
                                now))));
    }

    private Mono<Void> deleteExistingSlot(Long characterProfileId, EquipmentSlot slot, Integer slotIndex) {
        if (characterProfileId == null) {
            return Mono.empty();
        }

        return repository.findAllByCharacterProfileIdOrderByUpdatedAtDesc(characterProfileId)
                .filter(existing -> existing.slot() == slot && Objects.equals(existing.slotIndex(), slotIndex))
                .flatMap(existing -> repository.deleteById(existing.id()))
                .then();
    }

    private Mono<ResolvedSlot> resolveSaveSlot(ConfirmEquipmentRequest request) {
        if (request.characterProfileId() == null) {
            return Mono.just(new ResolvedSlot(request.slot(), normalizeSlotIndex(request.slot(), request.slotIndex())));
        }

        int capacity = slotCapacity(request.slot());
        if (capacity <= 1) {
            return Mono.just(new ResolvedSlot(request.slot(), null));
        }

        return repository.findAllByCharacterProfileIdOrderByUpdatedAtDesc(request.characterProfileId())
                .filter(existing -> existing.slot() == request.slot())
                .map(EquipmentItem::slotIndex)
                .filter(index -> index != null && index >= 1 && index <= capacity)
                .collect(Collectors.toSet())
                .map(occupiedIndexes -> new ResolvedSlot(
                        request.slot(),
                        firstEmptySlotIndex(capacity, occupiedIndexes)
                                .orElse(normalizeSlotIndex(request.slot(), request.slotIndex()))));
    }

    private Optional<Integer> firstEmptySlotIndex(int capacity, Set<Integer> occupiedIndexes) {
        return IntStream.rangeClosed(1, capacity)
                .boxed()
                .filter(index -> !occupiedIndexes.contains(index))
                .findFirst();
    }

    private Integer normalizeSlotIndex(EquipmentSlot slot, Integer requestedIndex) {
        int capacity = slotCapacity(slot);
        if (capacity <= 1) {
            return null;
        }

        if (requestedIndex == null || requestedIndex < 1 || requestedIndex > capacity) {
            return 1;
        }

        return requestedIndex;
    }

    private int slotCapacity(EquipmentSlot slot) {
        return switch (slot) {
            case RING -> 4;
            case PENDANT -> 2;
            case TOTEM -> 3;
            default -> 1;
        };
    }

    private record ResolvedSlot(EquipmentSlot slot, Integer slotIndex) {
    }

    public Flux<EquipmentItem> findAll(Long characterProfileId) {
        if (characterProfileId == null) {
            return repository.findAllByOrderByUpdatedAtDesc();
        }

        return repository.findAllByCharacterProfileIdOrderByUpdatedAtDesc(characterProfileId);
    }

    public Flux<EquipmentCatalogItem> findCatalog(EquipmentSlot slot) {
        if (slot == null) {
            return catalogRepository.findAllByOrderBySlotAscLevelRequirementAscNameAsc();
        }

        return catalogRepository.findAllBySlotOrderByLevelRequirementAscNameAsc(slot);
    }

    public Mono<Void> delete(Long id) {
        return repository.deleteById(id);
    }

    private OcrResult runOcr(byte[] imageBytes, String suffix) {
        Path inputFile = null;
        Path preprocessedFile = null;
        Path outputFile = null;
        Path errorFile = null;
        try {
            inputFile = Files.createTempFile("maplehelper-equipment-", suffix);
            preprocessedFile = Files.createTempFile("maplehelper-equipment-ocr-input-", ".png");
            outputFile = Files.createTempFile("maplehelper-equipment-ocr-", ".txt");
            errorFile = Files.createTempFile("maplehelper-equipment-ocr-errors-", ".txt");
            Files.write(inputFile, imageBytes);

            Path ocrInputFile = preprocessForOcr(inputFile, preprocessedFile) ? preprocessedFile : inputFile;
            Process process = new ProcessBuilder(tesseractCommand, ocrInputFile.toString(), "stdout", "--psm", "6", "-l", "eng")
                    .redirectOutput(outputFile.toFile())
                    .redirectError(errorFile.toFile())
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
                String errors = Files.readString(errorFile, StandardCharsets.UTF_8).trim();
                return new OcrResult(
                        "",
                        "OCR_FAILED",
                        "OCR command failed. Tesseract output: " + firstNonBlank(output, errors));
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
            if (preprocessedFile != null) {
                try {
                    Files.deleteIfExists(preprocessedFile);
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
            if (errorFile != null) {
                try {
                    Files.deleteIfExists(errorFile);
                } catch (IOException ignored) {
                    // Temporary files are best-effort cleanup.
                }
            }
        }
    }

    private boolean preprocessForOcr(Path inputFile, Path outputFile) {
        try {
            Process process = new ProcessBuilder(pythonCommand, equipmentOcrPreprocessorScript, inputFile.toString(), outputFile.toString())
                    .redirectErrorStream(true)
                    .start();
            if (!process.waitFor(OCR_TIMEOUT_SECONDS, TimeUnit.SECONDS)) {
                process.destroyForcibly();
                return false;
            }

            return process.exitValue() == 0 && Files.exists(outputFile) && Files.size(outputFile) > 0;
        } catch (IOException exception) {
            return false;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return false;
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
            Integer starForce = parsed.starForce() == null || parsed.starForce() < 0 ? null : parsed.starForce();
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

    private FlameExtractionResult extractFlameStats(byte[] imageBytes, String suffix) {
        Path inputFile = null;
        Path outputFile = null;
        try {
            inputFile = Files.createTempFile("maplehelper-flames-", suffix);
            outputFile = Files.createTempFile("maplehelper-flames-output-", ".json");
            Files.write(inputFile, imageBytes);

            Process process = new ProcessBuilder(pythonCommand, flameExtractorScript, inputFile.toString(), tesseractCommand)
                    .redirectErrorStream(true)
                    .redirectOutput(outputFile.toFile())
                    .start();

            if (!process.waitFor(OCR_TIMEOUT_SECONDS, TimeUnit.SECONDS)) {
                process.destroyForcibly();
                return new FlameExtractionResult("", "FLAMES_TIMED_OUT", "Flame extractor timed out.");
            }

            String output = Files.readString(outputFile, StandardCharsets.UTF_8).trim();
            if (process.exitValue() != 0) {
                return new FlameExtractionResult("", "FLAMES_FAILED", "Flame extractor failed: " + output);
            }

            FlameExtractorOutput parsed = objectMapper.readValue(output, FlameExtractorOutput.class);
            String flameStats = parsed.flameStats() == null ? "" : parsed.flameStats().trim();
            String notes = flameStats.isBlank()
                    ? "Flame extractor did not find green stat components."
                    : "Flame extractor found " + parsed.lines() + " green stat line(s).";
            return new FlameExtractionResult(flameStats, "FLAMES_COMPLETED", notes);
        } catch (IOException exception) {
            return new FlameExtractionResult(
                    "",
                    "FLAMES_UNAVAILABLE",
                    "Flame extractor unavailable. Ensure Python, Pillow, NumPy, Tesseract, and maplehelper.cv.flame-extractor-script are configured.");
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return new FlameExtractionResult("", "FLAMES_INTERRUPTED", "Flame extractor was interrupted.");
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

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }

        return "";
    }

    private record OcrResult(String text, String status, String notes) {
    }

    private record StarForceResult(Integer starForce, String status, String notes) {
    }

    private record FlameExtractionResult(String flameStats, String status, String notes) {
    }

    private record ImageExtractionResult(
            OcrResult ocr,
            Integer starForce,
            String flameStats,
            String status,
            String notes,
            boolean starSearchSkipped,
            boolean flameSearchSkipped,
            boolean potentialSkipped) {
    }

    private record StarCounterOutput(Integer starForce, Double confidence, Integer candidates, Integer components, String error) {
    }

    private record FlameExtractorOutput(String flameStats, Integer lines, String error) {
    }
}
