package app.maplehelper.character.nexon;

import app.maplehelper.character.CharacterNotFoundException;
import app.maplehelper.character.RankingRegion;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.ExchangeFunction;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.net.URI;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class NexonRankingsProviderTest {

    private static final NexonRankingsProperties PROPERTIES =
            new NexonRankingsProperties("https://www.nexon.com", "MapleHelper test");

    @Test
    void importsTheSearchTargetFromNexonRankingJson() {
        AtomicReference<URI> requestedUri = new AtomicReference<>();
        NexonRankingsProvider provider = providerReturning("""
                {
                  "totalCount": 1,
                  "ranks": [{
                    "characterName": "FangBlade",
                    "gap": 123456,
                    "rank": 330407,
                    "worldID": 1,
                    "characterImgURL": "https://msavatar1.nexon.net/Character/avatar.png",
                    "jobName": "Dark Knight",
                    "isSearchTarget": true
                  }]
                }
                """, requestedUri);

        StepVerifier.create(provider.findByName("fangblade", RankingRegion.NORTH_AMERICA))
                .assertNext(result -> {
                    assertThat(result.name()).isEqualTo("FangBlade");
                    assertThat(result.world()).isEqualTo("Bera");
                    assertThat(result.job()).isEqualTo("Dark Knight");
                    assertThat(result.weeklyRank()).isEqualTo(330_407L);
                    assertThat(result.weeklyExperience()).isEqualTo(123_456L);
                    assertThat(result.imageUrl()).hasHost("msavatar1.nexon.net");
                    assertThat(result.sourceUrl()).isEqualTo(URI.create(
                            "https://www.nexon.com/maplestory/rankings/na/overall/weekly?world_type=both&search_type=character-name&search=fangblade"));
                })
                .verifyComplete();

        assertThat(requestedUri.get().toString()).isEqualTo(
                "https://www.nexon.com/api/maplestory/no-auth/ranking/v2/na?type=overall&id=weekly&reboot_index=0&page_index=1&character_name=fangblade");
    }

    @Test
    void rejectsUntrustedAvatarUrls() {
        NexonRankingsProvider provider = providerReturning("""
                {
                  "totalCount": 1,
                  "ranks": [{
                    "characterName": "Unbob",
                    "gap": 10,
                    "rank": 1,
                    "worldID": 45,
                    "characterImgURL": "https://example.com/avatar.png",
                    "jobName": "Adele",
                    "isSearchTarget": true
                  }]
                }
                """, new AtomicReference<>());

        StepVerifier.create(provider.findByName("Unbob", RankingRegion.NORTH_AMERICA))
                .assertNext(result -> assertThat(result.imageUrl()).isNull())
                .verifyComplete();
    }

    @Test
    void reportsMissingCharacters() {
        NexonRankingsProvider provider = providerReturning("""
                {
                  "totalCount": 0,
                  "ranks": []
                }
                """, new AtomicReference<>());

        StepVerifier.create(provider.findByName("Missing", RankingRegion.NORTH_AMERICA))
                .expectError(CharacterNotFoundException.class)
                .verify();
    }

    private NexonRankingsProvider providerReturning(String responseBody, AtomicReference<URI> requestedUri) {
        ExchangeFunction exchangeFunction = request -> {
            requestedUri.set(request.url());
            return Mono.just(jsonResponse(responseBody));
        };
        WebClient webClient = WebClient.builder()
                .baseUrl(PROPERTIES.baseUrl())
                .exchangeFunction(exchangeFunction)
                .build();
        return new NexonRankingsProvider(webClient, PROPERTIES);
    }

    private ClientResponse jsonResponse(String body) {
        return ClientResponse.create(HttpStatus.OK)
                .header("Content-Type", "application/json")
                .body(body)
                .build();
    }
}
