import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAuth } from "../useAuth";
import { AuthContext } from "../../context/AuthContext";

function HookConsumer() {
  useAuth();
  return <div>hook consumer</div>;
}

function ContextReader() {
  const auth = useAuth();
  return <div>{auth.user?.username ?? "no-user"}</div>;
}

describe("useAuth", () => {
  it("throws an error when used outside AuthProvider context", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<HookConsumer />)).toThrow(
      "useAuth must be used within AuthProvider"
    );

    errorSpy.mockRestore();
  });

  it("returns the context value when used inside AuthProvider context", () => {
    render(
      <AuthContext.Provider value={{ user: { username: "skyblue" } }}>
        <ContextReader />
      </AuthContext.Provider>
    );

    expect(screen.getByText("skyblue")).toBeInTheDocument();
  });
});
