import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "../LoginForm";
import { login as loginApi } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";

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
  login: vi.fn(),
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

describe("LoginForm", () => {
  const loginContextMock = vi.fn();

  beforeEach(() => {
    useAuth.mockReturnValue({ login: loginContextMock });
    loginContextMock.mockReset();
    navigateMock.mockReset();
  });

  it("submits credentials and logs the user in", async () => {
    loginApi.mockResolvedValue({
      token: "token-123",
      user: { id: "u1", username: "skyblue" },
    });

    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/username/i), "skyblue");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(loginApi).toHaveBeenCalledWith("skyblue", "password123");
    });

    expect(loginContextMock).toHaveBeenCalledWith("token-123", {
      id: "u1",
      username: "skyblue",
    });
    expect(navigateMock).toHaveBeenCalledWith("/");
  });

  it("shows an error when login fails", async () => {
    loginApi.mockRejectedValue(new Error("Invalid credentials."));

    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/username/i), "skyblue");
    await user.type(screen.getByLabelText(/password/i), "wrongpass");
    await user.click(screen.getByRole("button", { name: /login/i }));

    expect(await screen.findByText("Invalid credentials.")).toBeInTheDocument();
    expect(loginContextMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
