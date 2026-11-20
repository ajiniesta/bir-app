import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuestionStatsButton from "@/app/components/QuestionStatsButton";

describe("QuestionStatsButton & QuestionStatsModal (popup de estadísticas de una pregunta)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it("abre el popup al pulsar el botón y muestra las veces respondida, % de acierto y dos gráficos de tarta concéntricos (interior usuario, exterior plataforma)", async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        questionId: 42,
        platform: {
          answered: 120,
          correct: 90,
          incorrect: 30,
          accuracy: 75.0,
        },
        user: {
          answered: 4,
          correct: 2,
          incorrect: 2,
          accuracy: 50.0,
        },
      }),
    });

    render(<QuestionStatsButton questionId={42} accessToken="test-jwt-token" />);

    const openBtn = screen.getByRole("button", { name: /estadísticas/i });
    expect(openBtn).toBeInTheDocument();

    await user.click(openBtn);

    // Verifica que el popup (dialog) se abre y consulta el endpoint de estadísticas de la pregunta
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/stats/questions/42",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-jwt-token",
        }),
      })
    );

    // Espera a que carguen los datos
    await waitFor(() => {
      expect(screen.getByTestId("concentric-pie-chart")).toBeInTheDocument();
    });

    // 1. Estadísticas de toda la plataforma (120 veces respondida, 75.0% acierto)
    const platformCard = screen.getByTestId("platform-stats-summary");
    expect(platformCard).toHaveTextContent(/toda la plataforma/i);
    expect(platformCard).toHaveTextContent("120");
    expect(platformCard).toHaveTextContent("75.0%");

    // 2. Estadísticas del usuario autenticado (4 veces respondida, 50.0% acierto)
    const userCard = screen.getByTestId("user-stats-summary");
    expect(userCard).toHaveTextContent(/tu historial|usuario/i);
    expect(userCard).toHaveTextContent("4");
    expect(userCard).toHaveTextContent("50.0%");

    // 3. Dos gráficos de tarta concéntricos: exterior = plataforma (radio mayor), interior = usuario (radio menor)
    const outerRing = screen.getByTestId("platform-pie-ring");
    const innerRing = screen.getByTestId("user-pie-ring");
    expect(outerRing).toBeInTheDocument();
    expect(innerRing).toBeInTheDocument();

    const outerRadius = Number(outerRing.getAttribute("data-radius"));
    const innerRadius = Number(innerRing.getAttribute("data-radius"));
    expect(outerRadius).toBeGreaterThan(innerRadius);

    // Cerrar el popup
    const closeBtn = screen.getByRole("button", { name: /cerrar/i });
    await user.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("muestra estado con 0 respuestas cuando la pregunta aún no ha sido respondida", async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        questionId: 42,
        platform: {
          answered: 0,
          correct: 0,
          incorrect: 0,
          accuracy: 0.0,
        },
        user: {
          answered: 0,
          correct: 0,
          incorrect: 0,
          accuracy: 0.0,
        },
      }),
    });

    render(<QuestionStatsButton questionId={42} accessToken="test-jwt-token" />);

    await user.click(screen.getByRole("button", { name: /estadísticas/i }));

    await waitFor(() => {
      expect(screen.getByTestId("concentric-pie-chart")).toBeInTheDocument();
    });

    expect(screen.getByTestId("platform-stats-summary")).toHaveTextContent("0.0%");
    expect(screen.getByTestId("user-stats-summary")).toHaveTextContent("0.0%");
  });
});
