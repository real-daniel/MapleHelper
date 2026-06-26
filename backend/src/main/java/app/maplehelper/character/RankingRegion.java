package app.maplehelper.character;

public enum RankingRegion {
    NORTH_AMERICA("na"),
    EUROPE("eu");

    private final String path;

    RankingRegion(String path) {
        this.path = path;
    }

    public String path() {
        return path;
    }
}
