
import GameBoard from "@/components/GameBoard";

const Index = () => {
  return (
    <div className="min-h-screen">
      <header className="py-4 px-6 text-white">
        <h1 className="text-3xl font-bold text-center">Solitaire</h1>
      </header>
      <main>
        <GameBoard />
      </main>
    </div>
  );
};

export default Index;
