import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import HomePage from "../HomePage";
import { fetchPlayers } from "../../services/api";

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
}));

describe("HomePage", () => {
  it("shows loading state before players are loaded", () => {
    fetchPlayers.mockImplementation(() => new Promise(() => {}));

    render(<HomePage />);

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
    render(<HomePage />);

    expect(await screen.findByText("Shohei Ohtani")).toBeInTheDocument();
    expect(screen.getByText("Aaron Judge")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Search players..."), "judge");

    expect(screen.getByText("Aaron Judge")).toBeInTheDocument();
    expect(screen.queryByText("Shohei Ohtani")).not.toBeInTheDocument();
  });

  it("shows error state when player fetch fails", async () => {
    fetchPlayers.mockRejectedValue(new Error("Failed to load players"));

    render(<HomePage />);

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
    render(<HomePage />);

    expect(await screen.findByText("Gerrit Cole")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "View" }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/player/player-42");
    });
  });
});
