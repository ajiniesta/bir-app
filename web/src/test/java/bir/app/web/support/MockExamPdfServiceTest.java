package bir.app.web.support;

import bir.app.web.dto.MockExamResponse;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("MockExamPdfService")
class MockExamPdfServiceTest {

    private final MockExamPdfService service = new MockExamPdfService();

    private static MockExamResponse exam() {
        MockExamResponse.QuestionSummary first = new MockExamResponse.QuestionSummary(
                1, 10L, "¿Cuál es el hueso más largo del cuerpo humano?", "Anatomía", "Tema 1",
                "El fémur es el hueso más largo.",
                List.of(new MockExamResponse.OptionSummary("A", "Fémur"),
                        new MockExamResponse.OptionSummary("B", "Tibia")));
        MockExamResponse.QuestionSummary second = new MockExamResponse.QuestionSummary(
                2, 11L, "¿Qué órgano bombea la sangre?", "Fisiología", null, null,
                List.of(new MockExamResponse.OptionSummary("A", "Hígado"),
                        new MockExamResponse.OptionSummary("B", "Corazón"),
                        new MockExamResponse.OptionSummary("C", "Pulmón")));
        return new MockExamResponse(5L, "Simulacro de prueba", "Descripción del simulacro",
                "MIR", "Médico Interno Residente", 2, List.of(first, second));
    }

    @Test
    @DisplayName("genera un PDF válido con enunciados, opciones, tags y explicación")
    void rendersValidPdf() throws Exception {
        byte[] pdf = service.render(exam());

        assertThat(pdf).isNotEmpty();
        assertThat(new String(pdf, 0, 4, StandardCharsets.US_ASCII)).isEqualTo("%PDF");

        try (PDDocument document = PDDocument.load(pdf)) {
            String text = new PDFTextStripper().getText(document);
            assertThat(text).contains("Simulacro de prueba");
            assertThat(text).contains("Banco: Médico Interno Residente (MIR)");
            assertThat(text).contains("¿Cuál es el hueso más largo del cuerpo humano?");
            assertThat(text).contains("Fémur");
            assertThat(text).contains("Tibia");
            assertThat(text).contains("Tag: #Tema 1");
            assertThat(text).contains("Explicación:");
            assertThat(text).contains("El fémur es el hueso más largo.");
            assertThat(text).contains("¿Qué órgano bombea la sangre?");
            assertThat(text).contains("Corazón");
            assertThat(text).contains("Hoja de respuestas");
        }
    }

    @Test
    @DisplayName("no revela cuál es la opción correcta")
    void doesNotRevealCorrectOption() throws Exception {
        byte[] pdf = service.render(exam());

        try (PDDocument document = PDDocument.load(pdf)) {
            String text = new PDFTextStripper().getText(document);
            assertThat(text).doesNotContain("Respuesta correcta");
            assertThat(text).doesNotContain("correcta:");
            assertThat(text).doesNotContain("✓");
        }
    }

    @Test
    @DisplayName("tolera un simulacro vacío y un título nulo")
    void rendersEmptyExam() {
        MockExamResponse empty = new MockExamResponse(1L, null, null, "MIR", "MIR", 0, List.of());

        byte[] pdf = service.render(empty);

        assertThat(new String(pdf, 0, 4, StandardCharsets.US_ASCII)).isEqualTo("%PDF");
    }
}
