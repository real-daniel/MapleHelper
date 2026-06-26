package app.maplehelper.character.nexon;

import app.maplehelper.character.CharacterDataProvider;
import app.maplehelper.character.CharacterNotFoundException;
import app.maplehelper.character.CharacterProviderException;
import app.maplehelper.character.ImportedCharacter;
import app.maplehelper.character.RankingRegion;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Component
public class NexonRankingsProvider implements CharacterDataProvider {

    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(10);
    private static final String AVATAR_HOST = "msavatar1.nexon.net";
    private static final Map<Integer, String> WORLD_NAMES = Map.ofEntries(
            Map.entry(0, "Scania"),
            Map.entry(1, "Bera"),
            Map.entry(2, "Broa"),
            Map.entry(3, "Windia"),
            Map.entry(4, "Khaini"),
            Map.entry(5, "Bellocan"),
            Map.entry(6, "Mardia"),
            Map.entry(7, "Kradia"),
            Map.entry(8, "Yellonde"),
            Map.entry(9, "Demethos"),
            Map.entry(10, "Galicia"),
            Map.entry(11, "El Nido"),
            Map.entry(12, "Zenith"),
            Map.entry(13, "Arcania"),
            Map.entry(14, "Chaos"),
            Map.entry(15, "Nova"),
            Map.entry(16, "Renegades"),
            Map.entry(17, "Aurora"),
            Map.entry(18, "Elysium"),
            Map.entry(19, "Scania"),
            Map.entry(30, "Luna"),
            Map.entry(45, "Kronos"),
            Map.entry(46, "Solis"),
            Map.entry(48, "Challengers Interactive"),
            Map.entry(49, "Challengers Interactive"),
            Map.entry(52, "Challengers Heroic"),
            Map.entry(54, "Challengers Heroic"),
            Map.entry(70, "Hyperion"));

    private final WebClient webClient;
    private final NexonRankingsProperties properties;

    public NexonRankingsProvider(WebClient nexonRankingsWebClient, NexonRankingsProperties properties) {
        this.webClient = nexonRankingsWebClient;
        this.properties = properties;
    }

    @Override
    public Mono<ImportedCharacter> findByName(String name, RankingRegion region) {
        URI apiUrl = buildApiUrl(name, region);
        URI sourceUrl = buildSourceUrl(name, region);

        return webClient.get()
                .uri(apiUrl)
                .retrieve()
                .onStatus(HttpStatusCode::isError, response -> Mono.error(
                        new CharacterProviderException("NEXON rankings returned HTTP " + response.statusCode().value())))
                .bodyToMono(NexonRankingResponse.class)
                .timeout(REQUEST_TIMEOUT)
                .map(response -> toImportedCharacter(response, name, region, sourceUrl))
                .onErrorMap(
                        error -> !(error instanceof CharacterProviderException)
                                && !(error instanceof CharacterNotFoundException),
                        error -> new CharacterProviderException(
                                "NEXON rankings request failed: " + error.getClass().getSimpleName()
                                        + " - " + error.getMessage(),
                                error));
    }

    private URI buildApiUrl(String name, RankingRegion region) {
        return UriComponentsBuilder.fromUriString(properties.baseUrl())
                .path("/api/maplestory/no-auth/ranking/v2/{region}")
                .queryParam("type", "overall")
                .queryParam("id", "weekly")
                .queryParam("reboot_index", 0)
                .queryParam("page_index", 1)
                .queryParam("character_name", name)
                .buildAndExpand(region.path())
                .encode()
                .toUri();
    }

    private URI buildSourceUrl(String name, RankingRegion region) {
        return UriComponentsBuilder.fromUriString(properties.baseUrl())
                .path("/maplestory/rankings/{region}/overall/weekly")
                .queryParam("world_type", "both")
                .queryParam("search_type", "character-name")
                .queryParam("search", name)
                .buildAndExpand(region.path())
                .encode()
                .toUri();
    }

    private ImportedCharacter toImportedCharacter(
            NexonRankingResponse response,
            String requestedName,
            RankingRegion region,
            URI sourceUrl) {
        NexonRankingCharacter character = response.ranks().stream()
                .filter(candidate -> candidate.isSearchTarget()
                        || candidate.characterName().equalsIgnoreCase(requestedName))
                .findFirst()
                .orElseThrow(() -> new CharacterNotFoundException(requestedName));

        return new ImportedCharacter(
                character.characterName(),
                WORLD_NAMES.getOrDefault(character.worldID(), "Unknown"),
                character.jobName(),
                character.rank(),
                character.gap(),
                validatedAvatarUrl(character.characterImgURL()),
                region,
                sourceUrl,
                Instant.now());
    }

    private URI validatedAvatarUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return null;
        }

        URI uri = URI.create(imageUrl);
        boolean trusted = "https".equalsIgnoreCase(uri.getScheme())
                && AVATAR_HOST.equals(uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT));
        return trusted ? uri : null;
    }

    private record NexonRankingResponse(
            int totalCount,
            List<NexonRankingCharacter> ranks) {
        private NexonRankingResponse {
            ranks = ranks == null ? List.of() : ranks;
        }
    }

    private record NexonRankingCharacter(
            String characterName,
            long gap,
            long rank,
            int worldID,
            @JsonProperty("characterImgURL") String characterImgURL,
            String jobName,
            boolean isSearchTarget) {
    }
}
