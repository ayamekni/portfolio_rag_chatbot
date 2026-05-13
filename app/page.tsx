import ChatWidget from '@/components/ChatWidget';

export default function Page() {
	return (
		<main
			style={{
				minHeight: '100vh',
				margin: 0,
				padding: 0,
				background: 'transparent',
				position: 'relative',
			}}
		>
			<ChatWidget />
		</main>
	);
}
