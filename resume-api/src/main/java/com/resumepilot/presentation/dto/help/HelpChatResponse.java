package com.resumepilot.presentation.dto.help;

import java.util.List;

public record HelpChatResponse(
        String reply,
        List<String> citations
) {}
