import Link from "next/link";

interface PageLayoutProps {
	title: string;
	icon?: string;
	subtitle?: string;
	backTo?: { href: string; label: string };
	children: React.ReactNode;
}

export function PageLayout({ title, icon, subtitle, backTo, children }: PageLayoutProps) {
	return (
		<div className="min-h-screen p-4 max-w-md mx-auto">
			{/* Header */}
			<div className="text-center mb-8 pt-8">
				<h1 className="text-3xl font-bold mb-2">
					{icon && <span className="mr-2">{icon}</span>}
					{title}
				</h1>
				{subtitle && <p className="text-gray-600 dark:text-gray-400">{subtitle}</p>}
				{backTo && (
					<Link href={backTo.href} className="text-blue-500 hover:underline">
						{backTo.label}
					</Link>
				)}
			</div>

			{/* Content */}
			{children}
		</div>
	);
}
