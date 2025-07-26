import { useCallback, useState } from "react";

interface UseFormStateOptions<T> {
	initialValues: T;
	validate?: (values: T) => Partial<Record<keyof T, string>>;
	onSubmit?: (values: T) => void | Promise<void>;
}

interface UseFormStateReturn<T> {
	values: T;
	errors: Partial<Record<keyof T, string>>;
	touched: Partial<Record<keyof T, boolean>>;
	isSubmitting: boolean;
	isValid: boolean;
	isDirty: boolean;
	setFieldValue: <K extends keyof T>(field: K, value: T[K]) => void;
	setFieldError: <K extends keyof T>(field: K, error: string) => void;
	setFieldTouched: <K extends keyof T>(field: K, touched?: boolean) => void;
	handleChange: <K extends keyof T>(
		field: K,
	) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
	handleBlur: <K extends keyof T>(
		field: K,
	) => (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
	handleSubmit: (e?: React.FormEvent) => Promise<void>;
	reset: () => void;
	validateForm: () => boolean;
	getFieldProps: <K extends keyof T>(
		field: K,
	) => {
		value: T[K];
		onChange: (
			e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
		) => void;
		onBlur: (
			e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
		) => void;
		name: string;
		id: string;
		"aria-invalid"?: boolean;
		"aria-describedby"?: string;
	};
}

export function useFormState<T extends Record<string, unknown>>({
	initialValues,
	validate,
	onSubmit,
}: UseFormStateOptions<T>): UseFormStateReturn<T> {
	const [values, setValues] = useState<T>(initialValues);
	const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
	const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [initialState] = useState(initialValues);

	const isDirty = JSON.stringify(values) !== JSON.stringify(initialState);

	const validateForm = useCallback(() => {
		if (!validate) return true;

		const validationErrors = validate(values);
		setErrors(validationErrors);
		return Object.keys(validationErrors).length === 0;
	}, [values, validate]);

	const isValid = Object.keys(errors).length === 0;

	const setFieldValue = useCallback(
		<K extends keyof T>(field: K, value: T[K]) => {
			setValues((prev) => ({ ...prev, [field]: value }));
			if (validate) {
				const fieldErrors = validate({ ...values, [field]: value });
				setErrors((prev) => ({ ...prev, [field]: fieldErrors[field] }));
			}
		},
		[values, validate],
	);

	const setFieldError = useCallback(<K extends keyof T>(field: K, error: string) => {
		setErrors((prev) => ({ ...prev, [field]: error }));
	}, []);

	const setFieldTouched = useCallback(<K extends keyof T>(field: K, touchedValue = true) => {
		setTouched((prev) => ({ ...prev, [field]: touchedValue }));
	}, []);

	const handleChange = useCallback(
		<K extends keyof T>(field: K) =>
			(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
				const value =
					e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
				setFieldValue(field, value as T[K]);
			},
		[setFieldValue],
	);

	const handleBlur = useCallback(
		<K extends keyof T>(field: K) =>
			() => {
				setFieldTouched(field, true);
			},
		[setFieldTouched],
	);

	const handleSubmit = useCallback(
		async (e?: React.FormEvent) => {
			e?.preventDefault();

			const allFieldsTouched: Record<keyof T, boolean> = {} as Record<keyof T, boolean>;
			for (const key of Object.keys(values) as Array<keyof T>) {
				allFieldsTouched[key] = true;
			}
			setTouched(allFieldsTouched);

			const isFormValid = validateForm();
			if (!isFormValid || !onSubmit) return;

			setIsSubmitting(true);
			try {
				await onSubmit(values);
			} finally {
				setIsSubmitting(false);
			}
		},
		[values, validateForm, onSubmit],
	);

	const reset = useCallback(() => {
		setValues(initialValues);
		setErrors({});
		setTouched({});
		setIsSubmitting(false);
	}, [initialValues]);

	const getFieldProps = useCallback(
		<K extends keyof T>(field: K) => {
			const fieldKey = String(field);
			const hasError = !!errors[field] && !!touched[field];

			return {
				value: values[field],
				onChange: handleChange(field),
				onBlur: handleBlur(field),
				name: fieldKey,
				id: fieldKey,
				...(hasError && {
					"aria-invalid": true,
					"aria-describedby": `${fieldKey}-error`,
				}),
			};
		},
		[values, errors, touched, handleChange, handleBlur],
	);

	return {
		values,
		errors,
		touched,
		isSubmitting,
		isValid,
		isDirty,
		setFieldValue,
		setFieldError,
		setFieldTouched,
		handleChange,
		handleBlur,
		handleSubmit,
		reset,
		validateForm,
		getFieldProps,
	};
}
