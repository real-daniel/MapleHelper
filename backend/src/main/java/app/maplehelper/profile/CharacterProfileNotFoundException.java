package app.maplehelper.profile;

public class CharacterProfileNotFoundException extends RuntimeException {

    public CharacterProfileNotFoundException(long id) {
        super("No saved character profile was found with id " + id + ".");
    }
}
