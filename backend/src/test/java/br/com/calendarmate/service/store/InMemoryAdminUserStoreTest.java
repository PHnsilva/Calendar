package br.com.calendarmate.service.store;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class InMemoryAdminUserStoreTest {
    @Test
    void findsConfiguredAdminByEquivalentPhoneFormats() {
        InMemoryAdminUserStore store = new InMemoryAdminUserStore("11987654321|Test Admin|OWNER");

        assertNotNull(store.findActiveByPhone("11987654321"));
        assertNotNull(store.findActiveByPhone("(11) 98765-4321"));
        assertNotNull(store.findActiveByPhone("+55 11 98765-4321"));
        assertNotNull(store.findActiveByPhone("5511987654321"));
    }

    @Test
    void doesNotAuthorizeUnknownOrInvalidPhones() {
        InMemoryAdminUserStore store = new InMemoryAdminUserStore("11987654321|Test Admin|OWNER");

        assertNull(store.findActiveByPhone("31999999999"));
        assertNull(store.findActiveByPhone("12345"));
    }
}
