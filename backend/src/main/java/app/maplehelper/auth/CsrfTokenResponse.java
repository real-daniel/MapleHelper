package app.maplehelper.auth;

public record CsrfTokenResponse(String token, String headerName) {
}
