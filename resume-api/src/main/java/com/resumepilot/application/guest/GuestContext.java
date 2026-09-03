package com.resumepilot.application.guest;

public final class GuestContext {

    private static final ThreadLocal<String> GUEST_ID = new ThreadLocal<>();

    private GuestContext() {}

    public static void set(String guestId) {
        GUEST_ID.set(guestId);
    }

    public static String get() {
        return GUEST_ID.get();
    }

    public static void clear() {
        GUEST_ID.remove();
    }
}
