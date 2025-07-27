import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useApiCall } from "@/hooks/useApiCall";
import { useFormState } from "@/hooks/useFormState";

describe("useFormState", () => {
  it("should initialize with provided initial state", () => {
    const initialState = { name: "John", email: "john@example.com" };
    const { result } = renderHook(() => useFormState(initialState));

    expect(result.current.formData).toEqual(initialState);
  });

  it("should update form data when setFormData is called", () => {
    const { result } = renderHook(() => useFormState({ name: "" }));

    act(() => {
      result.current.setFormData({ name: "John" });
    });

    expect(result.current.formData).toEqual({ name: "John" });
  });

  it("should handle field updates", () => {
    const { result } = renderHook(() => useFormState({ name: "", email: "" }));

    act(() => {
      result.current.handleFieldChange("name", "John");
    });

    expect(result.current.formData.name).toBe("John");
    expect(result.current.formData.email).toBe("");
  });

  it("should reset form to initial state", () => {
    const initialState = { name: "Initial" };
    const { result } = renderHook(() => useFormState(initialState));

    act(() => {
      result.current.setFormData({ name: "Changed" });
    });

    expect(result.current.formData.name).toBe("Changed");

    act(() => {
      result.current.resetForm();
    });

    expect(result.current.formData.name).toBe("Initial");
  });
});

describe("useApiCall", () => {
  it("should initialize with loading false and no error", () => {
    const mockFn = vi.fn();
    const { result } = renderHook(() => useApiCall(mockFn));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should set loading true when call is made", async () => {
    const mockFn = vi.fn().mockResolvedValue("success");
    const { result } = renderHook(() => useApiCall(mockFn));

    act(() => {
      result.current.call();
    });

    expect(result.current.loading).toBe(true);
  });

  it("should handle successful API calls", async () => {
    const mockFn = vi.fn().mockResolvedValue("success");
    const { result } = renderHook(() => useApiCall(mockFn));

    await act(async () => {
      await result.current.call();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockFn).toHaveBeenCalledOnce();
  });

  it("should handle API call errors", async () => {
    const mockError = new Error("API Error");
    const mockFn = vi.fn().mockRejectedValue(mockError);
    const { result } = renderHook(() => useApiCall(mockFn));

    await act(async () => {
      await result.current.call();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toEqual(mockError);
  });

  it("should reset error state on new call", async () => {
    const mockError = new Error("API Error");
    const mockFn = vi.fn().mockRejectedValueOnce(mockError).mockResolvedValueOnce("success");

    const { result } = renderHook(() => useApiCall(mockFn));

    // First call with error
    await act(async () => {
      await result.current.call();
    });
    expect(result.current.error).toEqual(mockError);

    // Second call should reset error
    await act(async () => {
      await result.current.call();
    });
    expect(result.current.error).toBeNull();
  });

  it("should pass arguments to the API function", async () => {
    const mockFn = vi.fn().mockResolvedValue("success");
    const { result } = renderHook(() => useApiCall(mockFn));

    await act(async () => {
      await result.current.call("arg1", "arg2");
    });

    expect(mockFn).toHaveBeenCalledWith("arg1", "arg2");
  });
});
