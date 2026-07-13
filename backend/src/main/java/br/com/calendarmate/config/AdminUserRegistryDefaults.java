package br.com.calendarmate.config;

public final class AdminUserRegistryDefaults {
    public static final String OWNER_ID = "owner-main";
    public static final String OWNER_PHONE = "31995438467";
    public static final String OWNER_NAME = "SG Admin";

    public static final String DEFAULT_SEED =
            OWNER_PHONE + "|" + OWNER_NAME + "|OWNER|" + OWNER_ID
                    + ";31900000001|Prestador 1|PROVIDER|provider-1"
                    + ";31900000002|Prestador 2|PROVIDER|provider-2"
                    + ";31900000003|Prestador 3|PROVIDER|provider-3";

    private AdminUserRegistryDefaults() {
    }
}
