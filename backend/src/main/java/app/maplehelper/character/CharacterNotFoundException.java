package app.maplehelper.character;

public class CharacterNotFoundException extends RuntimeException {

    public CharacterNotFoundException(String name) {
        super("No ranked character was found for '" + name + "'.");
    }
}

