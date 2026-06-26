package app.maplehelper.character.nexon;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "maplehelper.nexon-rankings")
public record NexonRankingsProperties(
        String baseUrl,
        String userAgent
) {
}

