package br.com.calendarmate.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GlobalExceptionHandlerTest {

    private final MockMvc mvc = MockMvcBuilders
            .standaloneSetup(new ThrowingController())
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();

    @Test
    void mapsSupabaseDependencyFailuresToSafeRetryablePayloads() throws Exception {
        MvcResult result = mvc.perform(get("/api/admin/auth/supabase"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("DEPENDENCY_UNAVAILABLE"))
                .andExpect(jsonPath("$.error").value("DEPENDENCY_UNAVAILABLE"))
                .andExpect(jsonPath("$.message").value("Não foi possível concluir agora. Tente novamente em alguns instantes."))
                .andExpect(jsonPath("$.retryable").value(true))
                .andReturn();

        assertThat(result.getResponse().getContentAsString())
                .doesNotContain("Supabase")
                .doesNotContain("SUPABASE")
                .doesNotContain("database")
                .doesNotContain("DNS");
    }

    @Test
    void mapsInvalidAdminPasswordToFriendlyMessage() throws Exception {
        mvc.perform(post("/api/admin/auth/password"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("INVALID_ADMIN_PASSWORD"))
                .andExpect(jsonPath("$.message").value("Senha incorreta. Confira e tente novamente."))
                .andExpect(jsonPath("$.field").value("password"))
                .andExpect(jsonPath("$.retryable").value(false));
    }

    @Test
    void mapsTechnicalRouteFailuresToRouteMessage() throws Exception {
        MvcResult result = mvc.perform(get("/api/rotas/config"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("ROUTE_UNAVAILABLE"))
                .andExpect(jsonPath("$.message").value("Não foi possível calcular a rota agora. Tente novamente em instantes."))
                .andExpect(jsonPath("$.retryable").value(true))
                .andReturn();

        assertThat(result.getResponse().getContentAsString())
                .doesNotContain("Google")
                .doesNotContain("API key");
    }

    @Test
    void mapsBookingSlotConflictsToActionableMessage() throws Exception {
        mvc.perform(post("/api/servicos/conflict"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("BOOKING_SLOT_UNAVAILABLE"))
                .andExpect(jsonPath("$.message").value("Esse horário acabou de ficar indisponível. Escolha outro horário."))
                .andExpect(jsonPath("$.retryable").value(false));
    }

    @Test
    void mapsUnexpectedExceptionsWithoutRawDiagnostics() throws Exception {
        MvcResult result = mvc.perform(get("/api/boom"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("UNEXPECTED_ERROR"))
                .andExpect(jsonPath("$.message").value("Algo deu errado ao concluir a ação. Tente novamente."))
                .andReturn();

        assertThat(result.getResponse().getContentAsString())
                .doesNotContain("SQL")
                .doesNotContain("stack")
                .doesNotContain("exception");
    }

    @RestController
    static class ThrowingController {
        @GetMapping("/api/admin/auth/supabase")
        void supabaseDependencyFailure() {
            throw new ExternalServiceException(
                    HttpStatus.BAD_GATEWAY,
                    "SUPABASE_CONNECTION_FAILED",
                    "Falha de conexao ao consultar Supabase.",
                    "Supabase",
                    null,
                    null);
        }

        @PostMapping("/api/admin/auth/password")
        void invalidAdminPassword() {
            throw new ForbiddenException("Senha administrativa invalida");
        }

        @GetMapping("/api/rotas/config")
        void routeConfigFailure() {
            throw new BadRequestException("Google Routes API key não configurada");
        }

        @PostMapping("/api/servicos/conflict")
        void bookingConflict() {
            throw new ConflictException("Horário indisponível");
        }

        @GetMapping("/api/boom")
        void unexpectedFailure() {
            throw new RuntimeException("SQL exception stack trace");
        }
    }
}
