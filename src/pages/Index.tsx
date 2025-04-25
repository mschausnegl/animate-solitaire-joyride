
import GameBoard from "@/components/GameBoard";

const Index = () => {
  return (
    <div className="min-h-screen">
      <header className="py-4 px-6 bg-[#1e3828] text-white">
        <h1 className="text-3xl font-bold text-center">Solitaire</h1>
        <p className="text-center text-sm mt-1 text-gray-300">Click cards to move them • Use the buttons for game controls</p>
      </header>
      <main>
        <GameBoard />
      </main>
    </div>
  );
};

export default Index;
