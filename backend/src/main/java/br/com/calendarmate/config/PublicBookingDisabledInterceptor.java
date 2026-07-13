package br.com.calendarmate.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Component
public class PublicBookingDisabledInterceptor implements HandlerInterceptor {

    private static final String DISABLED_MESSAGE =
            "Solicita\u00e7\u00f5es pelo site ainda n\u00e3o est\u00e3o dispon\u00edveis. Entre em contato pelo WhatsApp.";

    // Temporary production holding mode: keep public booking writes disabled until online booking is ready.
    private static final List<BlockedEndpoint> BLOCKED_ENDPOINTS = List.of(
            new BlockedEndpoint("POST", "/api/servicos", false),
            new BlockedEndpoint("PUT", "/api/servicos/me/", true),
            new BlockedEndpoint("DELETE", "/api/servicos/me/", true),
            new BlockedEndpoint("POST", "/api/verify/start", false),
            new BlockedEndpoint("POST", "/api/verify/resend", false),
            new BlockedEndpoint("POST", "/api/verify/confirm", false),
            new BlockedEndpoint("POST", "/api/recovery/start", false),
            new BlockedEndpoint("POST", "/api/recovery/resend", false),
            new BlockedEndpoint("POST", "/api/recovery/confirm", false)
    );

    @Value("${public.booking.disabled:false}")
    private boolean publicBookingDisabled;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws IOException {
        if (!publicBookingDisabled || !isBlocked(request)) {
            return true;
        }

        response.setStatus(HttpStatus.SERVICE_UNAVAILABLE.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write(
                "{\"code\":\"PUBLIC_BOOKING_UNAVAILABLE\","
                        + "\"error\":\"PUBLIC_BOOKING_UNAVAILABLE\","
                        + "\"message\":\"" + DISABLED_MESSAGE + "\","
                        + "\"retryable\":false}");
        return false;
    }

    private boolean isBlocked(HttpServletRequest request) {
        String method = request.getMethod();
        String path = requestPath(request);
        return BLOCKED_ENDPOINTS.stream().anyMatch(endpoint -> endpoint.matches(method, path));
    }

    private String requestPath(HttpServletRequest request) {
        String path = request.getRequestURI();
        String contextPath = request.getContextPath();
        if (contextPath != null && !contextPath.isBlank() && path.startsWith(contextPath)) {
            return path.substring(contextPath.length());
        }
        return path;
    }

    private record BlockedEndpoint(String method, String path, boolean prefixMatch) {
        boolean matches(String requestMethod, String requestPath) {
            if (!method.equalsIgnoreCase(requestMethod)) {
                return false;
            }
            if (prefixMatch) {
                return requestPath.startsWith(path);
            }
            return requestPath.equals(path) || requestPath.equals(path + "/");
        }
    }
}
