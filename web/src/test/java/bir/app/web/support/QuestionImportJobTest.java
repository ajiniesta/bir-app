package bir.app.web.support;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("QuestionImportJob")
class QuestionImportJobTest {

    private static List<String> objects(int count) {
        return IntStream.rangeClosed(1, count).mapToObj(i -> "{\"text\":\"P" + i + "\"}").toList();
    }

    @Test
    @DisplayName("trocea los objetos en lotes del tamaño indicado")
    void splitsIntoBatches() {
        QuestionImportJob job = QuestionImportJob.of(objects(250), 100);

        assertThat(job.totalBatches()).isEqualTo(3);
        assertThat(job.totalQuestions()).isEqualTo(250);
        assertThat(job.batch(2)).hasValueSatisfying(last -> assertThat(last.split("\n")).hasSize(50));
    }

    @Test
    @DisplayName("un fichero más pequeño que el lote genera un solo lote")
    void singleBatchWhenFileIsSmall() {
        QuestionImportJob job = QuestionImportJob.of(objects(7), 100);

        assertThat(job.totalBatches()).isEqualTo(1);
        assertThat(job.batch(0)).hasValueSatisfying(content -> assertThat(content.split("\n")).hasSize(7));
    }

    @Test
    @DisplayName("devuelve vacío para un índice fuera de rango")
    void rejectsOutOfRangeIndex() {
        QuestionImportJob job = QuestionImportJob.of(objects(3), 100);

        assertThat(job.batch(-1)).isEmpty();
        assertThat(job.batch(1)).isEmpty();
    }

    @Test
    @DisplayName("cada trabajo tiene un identificador distinto")
    void generatesUniqueIdentifiers() {
        assertThat(QuestionImportJob.of(objects(1), 100).id())
                .isNotEqualTo(QuestionImportJob.of(objects(1), 100).id());
    }
}
