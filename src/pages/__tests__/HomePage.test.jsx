import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "../HomePage";
import { DraftContext } from "../../context/DraftContext";
import { ToastContext } from "../../context/ToastContext";
import { fetchPlayers, fetchPlayersValuationsAll } from "../../services/api";

const { navigateMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("../../services/api", () => ({
  fetchPlayers: vi.fn(),
  fetchPlayersValuationsAll: vi.fn(),
  undoLastPick: vi.fn(),
}));

const toast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
};

function renderHome(contextOverrides = {}) {
  const draftContext = {
    draftedPlayerIds: new Set(),
    pickHistory: [],
    draftId: null,
    teams: [],
    removeLastPick: vi.fn(),
    ...contextOverrides,
  };

  return render(
    <ToastContext.Provider value={toast}>
      <DraftContext.Provider value={draftContext}>
        <HomePage />
      </DraftContext.Provider>
    </ToastContext.Provider>
  );
}

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigateMock.mockClear();
    fetchPlayersValuationsAll.mockResolvedValue({ values: [] });
  });

  it("shows loading state before players are loaded", () => {
    fetchPlayers.mockImplementation(() => new Promise(() => {}));

    renderHome();

    expect(screen.getByText("Loading players...")).toBeInTheDocument();
  });

  it("renders players from API and applies search filter", async () => {
    fetchPlayers.mockResolvedValue([
      {
        id: "p1",
        name: "Shohei Ohtani",
        position: "DH",
        team: "LAD",
        league: "NL",
        avg: 0.31,
        hr: 54,
        rbi: 130,
        sb: 20,
        isPitcher: false,
      },
      {
        id: "p2",
        name: "Aaron Judge",
        position: "OF",
        team: "NYY",
        league: "AL",
        avg: 0.29,
        hr: 52,
        rbi: 122,
        sb: 8,
        isPitcher: false,
      },
    ]);

    const user = userEvent.setup();
    renderHome();

    expect(await screen.findByText("Shohei Ohtani")).toBeInTheDocument();
    expect(screen.getByText("Aaron Judge")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Search players..."), "judge");

    expect(screen.getByText("Aaron Judge")).toBeInTheDocument();
    expect(screen.queryByText("Shohei Ohtani")).not.toBeInTheDocument();
  });

  it("renders bulk valuation results for an active draft", async () => {
    fetchPlayers.mockResolvedValue([
      {
        id: "605141",
        name: "Mookie Betts",
        position: "OF",
        team: "LAD",
        league: "NL",
        avg: 0.29,
        hr: 35,
        rbi: 100,
        sb: 12,
        isPitcher: false,
      },
      {
        id: "660271",
        name: "Shohei Ohtani",
        position: "DH",
        team: "LAD",
        league: "NL",
        avg: 0.31,
        hr: 44,
        rbi: 95,
        sb: 20,
        isPitcher: false,
      },
    ]);
    fetchPlayersValuationsAll.mockResolvedValue({
      values: [
        { playerId: 605141, value: 38 },
        { playerId: 660271, value: 45 },
      ],
    });

    renderHome({ draftId: "draft-1" });

    expect(await screen.findByText("Mookie Betts")).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchPlayersValuationsAll).toHaveBeenCalledWith(["605141", "660271"]);
      expect(screen.getByText("$38")).toBeInTheDocument();
      expect(screen.getByText("$45")).toBeInTheDocument();
    });
  });

  it("shows error state when player fetch fails", async () => {
    fetchPlayers.mockRejectedValue(new Error("Failed to load players"));

    renderHome();

    expect(await screen.findByText("Failed to load players")).toBeInTheDocument();
  });

  it("navigates to player page when View is clicked", async () => {
    fetchPlayers.mockResolvedValue([
      {
        id: "player-42",
        name: "Gerrit Cole",
        position: "P",
        team: "NYY",
        league: "AL",
        avg: 2.91,
        hr: 0,
        rbi: 0,
        sb: 0,
        isPitcher: true,
      },
    ]);

    const user = userEvent.setup();
    renderHome();

    expect(await screen.findByText("Gerrit Cole")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "View" }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/player/player-42");
    });
  });
});
