import { useCallback } from "react";
import { useApiCall } from "@/hooks/useApiCall";
import { useFormState } from "@/hooks/useFormState";
import { APP_CONFIG } from "@/lib/constants";
import type { CreateInjectionRequest, CreateInjectionResponse } from "@/types/api";
import type { InjectionType } from "@/types/injection";

type InjectionFormValues = {
	userName: string;
};

interface UseInjectionFormOptions {
	onSuccess?: () => void | Promise<void>;
	onError?: (error: Error) => void;
}

export function useInjectionForm({ onSuccess, onError }: UseInjectionFormOptions = {}) {
	const { execute: createInjection, loading } = useApiCall<
		CreateInjectionResponse,
		CreateInjectionRequest
	>("/api/injections", {
		method: "POST",
	});

	const form = useFormState<InjectionFormValues>({
		initialValues: {
			userName: "",
		},
		validate: (values) => {
			const errors: Partial<Record<keyof InjectionFormValues, string>> = {};

			if (!values.userName.trim()) {
				errors.userName = "Name is required";
			} else if (values.userName.length > APP_CONFIG.MAX_NAME_LENGTH) {
				errors.userName = `Name must be less than ${APP_CONFIG.MAX_NAME_LENGTH} characters`;
			}

			return errors;
		},
	});

	const logInjection = useCallback(
		async (type: InjectionType) => {
			const isValid = form.validateForm();
			if (!isValid) {
				form.setFieldTouched("userName", true);
				return;
			}

			const injectionData: CreateInjectionRequest = {
				user_name: form.values.userName.trim(),
				injection_time: new Date().toISOString(),
				injection_type: type,
			};

			const result = await createInjection(injectionData);

			if (result) {
				form.reset();
				await onSuccess?.();
			} else if (onError) {
				onError(new Error("Failed to log injection"));
			}
		},
		[form, createInjection, onSuccess, onError],
	);

	return {
		...form,
		logInjection,
		isLogging: loading,
	};
}
