import type { ChangeEvent, FocusEvent } from "react";
import { APP_CONFIG } from "@/lib/constants";
import { cn, inputStyles } from "@/lib/styles";

/**
 * Props for the UserNameInput component
 */
export interface UserNameInputProps {
  /** Current value of the input */
  value: string;
  /** Callback when the value changes */
  onChange: (value: string) => void;
  /** Callback when the input loses focus (optional) */
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  /** Error message to display */
  error?: string;
  /** Whether the field has been touched/focused */
  touched?: boolean;
  /** Whether the input is required */
  required?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to show as a prompt with save button */
  showPrompt?: boolean;
  /** Callback when prompt is closed/saved */
  onPromptSave?: () => void;
  /** Label for the input (screen reader only by default) */
  label?: string;
  /** Whether to show the label visually */
  showLabel?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A specialized input component for entering user names with validation.
 * Can be used as a standalone input or as a prompt with save functionality.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <UserNameInput
 *   value={userName}
 *   onChange={setUserName}
 *   placeholder="Enter your name"
 * />
 *
 * // With validation
 * <UserNameInput
 *   value={userName}
 *   onChange={setUserName}
 *   error={errors.userName}
 *   touched={touched.userName}
 *   required
 * />
 *
 * // As a prompt
 * <UserNameInput
 *   value={userName}
 *   onChange={setUserName}
 *   showPrompt
 *   onPromptSave={() => setShowPrompt(false)}
 * />
 * ```
 */
export function UserNameInput({
  value,
  onChange,
  onBlur,
  error,
  touched,
  required = false,
  placeholder = "Enter your name",
  showPrompt = false,
  onPromptSave,
  label = "Your name",
  showLabel = false,
  className,
}: UserNameInputProps) {
  const hasError = Boolean(error && touched);
  const isValid = value.trim().length > 0 && value.trim().length <= APP_CONFIG.MAX_NAME_LENGTH;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const inputElement = (
    <>
      <label
        htmlFor="userName"
        className={cn(
          !showLabel && "sr-only",
          showLabel && "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2",
        )}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        id="userName"
        type="text"
        name="userName"
        autoComplete="name"
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        maxLength={APP_CONFIG.MAX_NAME_LENGTH}
        className={cn(inputStyles, hasError && "border-red-500 focus:ring-red-500", className)}
        aria-invalid={hasError}
        aria-describedby={hasError ? "userName-error" : undefined}
        aria-required={required}
      />
      {hasError && (
        <p id="userName-error" className="text-sm text-red-500 mt-1">
          {error}
        </p>
      )}
    </>
  );

  if (showPrompt) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-3">
          Please enter your name first:
        </p>
        <div className="space-y-3">
          {inputElement}
          {onPromptSave && (
            <button
              type="button"
              onClick={onPromptSave}
              disabled={!isValid}
              className={cn(
                "w-full py-2 px-4 rounded-md font-medium transition-colors",
                isValid
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed",
              )}
            >
              Save
            </button>
          )}
        </div>
      </div>
    );
  }

  return <div className="space-y-1">{inputElement}</div>;
}
