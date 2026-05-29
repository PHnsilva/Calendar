package br.com.calendarmate.service.store;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class InMemoryAdminUserStoreTest {
    @Test
    void findsConfiguredAdminByEquivalentPhoneFormats() {
        InMemoryAdminUserStore store = new InMemoryAdminUserStore("31995438467|SG Admin|OWNER");

        assertNotNull(store.findActiveByPhone("31995438467"));
        assertNotNull(store.findActiveByPhone("(31) 99543-8467"));
        assertNotNull(store.findActiveByPhone("+55 31 99543-8467"));
        assertNotNull(store.findActiveByPhone("5531995438467"));
    }

    @Test
    void doesNotAuthorizeUnknownOrInvalidPhones() {
        InMemoryAdminUserStore store = new InMemoryAdminUserStore("31995438467|SG Admin|OWNER");

        assertNull(store.findActiveByPhone("31999999999"));
        assertNull(store.findActiveByPhone("12345"));
    }
}
