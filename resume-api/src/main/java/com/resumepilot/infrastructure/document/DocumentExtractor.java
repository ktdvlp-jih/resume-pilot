package com.resumepilot.infrastructure.document;

import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Base64;

@Component
public class DocumentExtractor {

    public ExtractedDocument extract(MultipartFile file) {
        String contentType = file.getContentType() != null ? file.getContentType() : "";
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "upload";

        try {
            if (contentType.contains("pdf") || filename.toLowerCase().endsWith(".pdf")) {
                return new ExtractedDocument(extractPdf(file.getBytes()), "PDF", filename);
            }
            if (contentType.startsWith("image/") || isImageFilename(filename)) {
                return new ExtractedDocument(null, "IMAGE", filename, Base64.getEncoder().encodeToString(file.getBytes()), contentType);
            }
            if (contentType.startsWith("text/") || filename.endsWith(".txt")) {
                return new ExtractedDocument(new String(file.getBytes()), "TEXT", filename);
            }
            return new ExtractedDocument(new String(file.getBytes()), "TEXT", filename);
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "파일 읽기 실패: " + e.getMessage());
        }
    }

    private String extractPdf(byte[] bytes) throws IOException {
        try (PDDocument doc = Loader.loadPDF(bytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(doc);
            if (text == null || text.isBlank()) {
                throw new BusinessException(ErrorCode.INVALID_INPUT, "PDF에서 텍스트를 추출할 수 없습니다.");
            }
            return text.trim();
        }
    }

    private boolean isImageFilename(String filename) {
        String lower = filename.toLowerCase();
        return lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg")
                || lower.endsWith(".webp") || lower.endsWith(".gif");
    }

    public record ExtractedDocument(String text, String sourceType, String filename, String fileBase64, String mimeType) {
        public ExtractedDocument(String text, String sourceType, String filename) {
            this(text, sourceType, filename, null, null);
        }
    }
}
