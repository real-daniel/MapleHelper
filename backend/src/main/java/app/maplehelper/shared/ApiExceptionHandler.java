package app.maplehelper.shared;

import app.maplehelper.character.CharacterNotFoundException;
import app.maplehelper.character.CharacterProviderException;
import app.maplehelper.profile.CharacterProfileNotFoundException;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.support.WebExchangeBindException;

import java.time.Instant;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(CharacterNotFoundException.class)
    ResponseEntity<ApiError> handleNotFound(CharacterNotFoundException exception) {
        return response(HttpStatus.NOT_FOUND, "CHARACTER_NOT_FOUND", exception.getMessage());
    }

    @ExceptionHandler(CharacterProfileNotFoundException.class)
    ResponseEntity<ApiError> handleProfileNotFound(CharacterProfileNotFoundException exception) {
        return response(HttpStatus.NOT_FOUND, "PROFILE_NOT_FOUND", exception.getMessage());
    }

    @ExceptionHandler(CharacterProviderException.class)
    ResponseEntity<ApiError> handleProviderFailure(CharacterProviderException exception) {
        return response(HttpStatus.BAD_GATEWAY, "CHARACTER_PROVIDER_UNAVAILABLE", exception.getMessage());
    }

    @ExceptionHandler({ConstraintViolationException.class, WebExchangeBindException.class, IllegalArgumentException.class})
    ResponseEntity<ApiError> handleInvalidRequest(Exception exception) {
        return response(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", exception.getMessage());
    }

    private ResponseEntity<ApiError> response(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).body(new ApiError(code, message, Instant.now()));
    }
}
