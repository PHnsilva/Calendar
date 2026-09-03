package br.com.calendarmate.service;

import br.com.calendarmate.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;

import java.util.Set;

@Service
public class ClientIpResolver {
    private final AppProperties props;

    public ClientIpResolver(AppProperties props) {
        this.props = props;
    }

    public String resolve(HttpServletRequest request) {
        String remoteAddress = clean(request.getRemoteAddr());
        Set<String> trustedProxies = props.getTrustedProxyAddresses();
        if (!props.isTrustProxyHeaders() || !trustedProxies.contains(remoteAddress)) {
            return remoteAddress.isBlank() ? "unknown" : remoteAddress;
        }

        String forwardedFor = clean(request.getHeader("X-Forwarded-For"));
        if (!forwardedFor.isBlank()) {
            String[] chain = forwardedFor.split(",");
            // Walk from the trusted edge inward. This prevents a caller from
            // bypassing limits by prepending an arbitrary value to XFF when a
            // compliant proxy appends the actual source address.
            for (int index = chain.length - 1; index >= 0; index--) {
                String candidate = clean(chain[index]);
                if (!candidate.isBlank() && !trustedProxies.contains(candidate)) return candidate;
            }
        }
        String realIp = clean(request.getHeader("X-Real-IP"));
        return realIp.isBlank() ? remoteAddress : realIp;
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }
}
