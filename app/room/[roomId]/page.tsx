import RoomPage from '@/components/RoomPage';

interface PageProps {
  params: Promise<{ roomId: string }>;
}

export default async function RoomRoute({ params }: PageProps) {
  const { roomId } = await params;
  return <RoomPage initialRoomId={roomId} />;
}
