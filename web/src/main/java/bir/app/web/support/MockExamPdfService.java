package bir.app.web.support;

import bir.app.web.dto.MockExamResponse;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import jakarta.inject.Singleton;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Genera el PDF de un simulacro completo (todas sus preguntas con sus opciones,
 * sin revelar la respuesta correcta) más una hoja de respuestas final, listo
 * para imprimir y contestar a mano.
 */
@Singleton
public class MockExamPdfService {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    /** Preguntas que caben por fila en la hoja de respuestas. */
    private static final int ANSWERS_PER_ROW = 5;

    private static final String CSS = """
            @page {
                size: A4;
                margin: 16mm 14mm 18mm 14mm;
                @bottom-center {
                    content: "Página " counter(page) " de " counter(pages);
                    font-size: 8pt; color: #777;
                }
            }
            * { box-sizing: border-box; }
            body { font-family: Helvetica, Arial, sans-serif; font-size: 10pt; color: #000; }
            .head { border-bottom: 2px solid #000; padding-bottom: 6pt; margin-bottom: 12pt; }
            .brand { font-size: 9pt; letter-spacing: 1pt; text-transform: uppercase; color: #666; }
            h1 { font-size: 16pt; margin: 2pt 0 4pt 0; }
            .meta { font-size: 9pt; color: #333; }
            .meta span { margin-right: 14pt; }
            .desc { font-size: 9.5pt; color: #333; margin: 4pt 0 0 0; }
            .instructions { font-size: 9pt; font-style: italic; color: #444; margin: 6pt 0 0 0; }
            .q { margin-bottom: 10pt; page-break-inside: avoid; break-inside: avoid; }
            .qhead { font-weight: bold; }
            .qnum { margin-right: 3pt; }
            .qcat { font-size: 8pt; color: #666; margin-top: 1pt; }
            .opt { margin: 1pt 0 1pt 14pt; }
            .letter { font-weight: bold; }
            .explanation { margin: 3pt 0 0 0; padding: 3pt 5pt; border-left: 2pt solid #999;
                           font-size: 9pt; color: #333; white-space: pre-wrap; }
            .explabel { font-weight: bold; }
            .answersheet { page-break-before: always; break-before: page; }
            .answersheet h2 { font-size: 13pt; margin: 0 0 8pt 0; }
            table.answers { width: 100%; border-collapse: collapse; }
            table.answers td.cell { border: 1px solid #999; padding: 5pt 3pt; width: 20%; vertical-align: middle; }
            table.answers td.empty { border: none; }
            .num { font-weight: bold; margin-right: 4pt; }
            .box { display: inline-block; border: 1px solid #000; width: 12pt; height: 12pt;
                   line-height: 12pt; text-align: center; font-size: 7pt; margin-right: 2pt; }
            """;

    /** Renderiza el simulacro a un PDF en memoria. */
    public byte[] render(MockExamResponse exam) {
        String xhtml = buildXhtml(exam);
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            builder.withHtmlContent(xhtml, null);
            builder.toStream(out);
            builder.run();
            return out.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo generar el PDF del simulacro", e);
        }
    }

    private String buildXhtml(MockExamResponse exam) {
        StringBuilder sb = new StringBuilder(4096);
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        sb.append("<html xmlns=\"http://www.w3.org/1999/xhtml\"><head>")
          .append("<meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\" />")
          .append("<title>").append(escape(exam.title())).append("</title>")
          .append("<style>").append(CSS).append("</style>")
          .append("</head><body>");

        // --- Cabecera ---------------------------------------------------------
        sb.append("<header class=\"head\">")
          .append("<div class=\"brand\">BirApp</div>")
          .append("<h1>").append(escape(exam.title())).append("</h1>")
          .append("<div class=\"meta\">")
          .append("<span>Banco: <strong>").append(escape(exam.examTypeName()))
          .append(" (").append(escape(exam.examTypeCode())).append(")</strong></span>")
          .append("<span>Preguntas: <strong>").append(exam.questionCount()).append("</strong></span>")
          .append("<span>Fecha: <strong>").append(LocalDate.now().format(DATE)).append("</strong></span>")
          .append("</div>");
        if (exam.description() != null && !exam.description().isBlank()) {
            sb.append("<p class=\"desc\">").append(escape(exam.description())).append("</p>");
        }
        sb.append("<p class=\"instructions\">Marca con una X la opción correcta de cada pregunta. ")
          .append("Puedes usar la hoja de respuestas final.</p>")
          .append("</header>");

        // --- Preguntas con sus opciones --------------------------------------
        sb.append("<div class=\"questions\">");
        for (MockExamResponse.QuestionSummary q : exam.questions()) {
            sb.append("<div class=\"q\">")
              .append("<div class=\"qhead\"><span class=\"qnum\">").append(q.position()).append(".</span>")
              .append(escape(q.text())).append("</div>");
            if (q.category() != null && !q.category().isBlank()) {
                sb.append("<div class=\"qcat\">").append(escape(q.category())).append("</div>");
            }
            for (MockExamResponse.OptionSummary o : q.options()) {
                sb.append("<div class=\"opt\"><span class=\"letter\">").append(escape(o.letter()))
                  .append(")</span> ").append(escape(o.text())).append("</div>");
            }
            if (q.explanation() != null && !q.explanation().isBlank()) {
                sb.append("<div class=\"explanation\"><span class=\"explabel\">Explicación:</span> ")
                  .append(escape(q.explanation())).append("</div>");
            }
            sb.append("</div>");
        }
        sb.append("</div>");

        // --- Hoja de respuestas ----------------------------------------------
        List<MockExamResponse.QuestionSummary> questions = exam.questions();
        sb.append("<section class=\"answersheet\"><h2>Hoja de respuestas</h2>")
          .append("<table class=\"answers\">");
        for (int i = 0; i < questions.size(); i += ANSWERS_PER_ROW) {
            sb.append("<tr>");
            for (int j = i; j < i + ANSWERS_PER_ROW; j++) {
                if (j >= questions.size()) {
                    sb.append("<td class=\"cell empty\"></td>");
                    continue;
                }
                MockExamResponse.QuestionSummary q = questions.get(j);
                sb.append("<td class=\"cell\"><span class=\"num\">").append(q.position()).append("</span>");
                for (MockExamResponse.OptionSummary o : q.options()) {
                    sb.append("<span class=\"box\">").append(escape(o.letter())).append("</span>");
                }
                sb.append("</td>");
            }
            sb.append("</tr>");
        }
        sb.append("</table></section>");

        sb.append("</body></html>");
        return sb.toString();
    }

    private static String escape(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
