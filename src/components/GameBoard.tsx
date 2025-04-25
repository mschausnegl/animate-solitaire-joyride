
import React, { useState, useEffect, useCallback } from 'react';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import Card from './Card';
import { Button } from '@/components/ui/button';
import { RefreshCw, RefreshCcw, ArrowLeft } from 'lucide-react';

gsap.registerPlugin(Draggable);

interface CardType {
  suit: string;
  value: string;
  isFlipped: boolean;
  id?: string;
}

const GameBoard = () => {
  const [deck, setDeck] = useState<CardType[]>([]);
  const [tableauPiles, setTableauPiles] = useState<CardType[][]>(Array(7).fill([]));
  const [foundationPiles, setFoundationPiles] = useState<CardType[][]>(Array(4).fill([]));
  const [stock, setStock] = useState<CardType[]>([]);
  const [waste, setWaste] = useState<CardType[]>([]);
  const [moveHistory, setMoveHistory] = useState<any[]>([]);
  const [gameStarted, setGameStarted] = useState(false);

  const initializeGame = useCallback(() => {
    const suits = ['♠', '♥', '♣', '♦'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const newDeck: CardType[] = [];

    suits.forEach(suit => {
      values.forEach(value => {
        newDeck.push({ 
          suit, 
          value, 
          isFlipped: false,
          id: `${value}-${suit}-${Math.random().toString(36).substring(2, 9)}`
        });
      });
    });

    // Shuffle deck
    const shuffledDeck = [...newDeck].sort(() => Math.random() - 0.5);
    setDeck(shuffledDeck);

    // Deal cards to tableau
    const newTableauPiles: CardType[][] = Array(7).fill([]).map(() => []);
    let cardIndex = 0;

    for (let i = 0; i < 7; i++) {
      for (let j = i; j < 7; j++) {
        newTableauPiles[j] = [...newTableauPiles[j], {
          ...shuffledDeck[cardIndex],
          // Only the top card of each pile should be flipped (showing face)
          isFlipped: j === i
        }];
        cardIndex++;
      }
    }

    setTableauPiles(newTableauPiles);
    setStock(shuffledDeck.slice(28));
    setWaste([]);
    setFoundationPiles(Array(4).fill([]));
    setMoveHistory([]);
    setGameStarted(true);
  }, []);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const dealFromStock = () => {
    if (stock.length === 0) {
      // Reset stock from waste
      setStock(waste.reverse().map(card => ({ ...card, isFlipped: false })));
      setWaste([]);
      
      // Add animation for recycling waste back to stock
      gsap.from(".stock-pile-card", {
        rotation: 360,
        duration: 0.5,
        ease: "power2.out"
      });
      
      return;
    }

    const newStock = [...stock];
    const dealtCard = newStock.pop();
    if (dealtCard) {
      dealtCard.isFlipped = true;
      setWaste([...waste, dealtCard]);
      
      // Record move for undo functionality
      setMoveHistory([...moveHistory, {
        type: 'dealFromStock',
        card: dealtCard,
        stockLength: newStock.length,
        wasteLength: waste.length
      }]);
    }
    setStock(newStock);

    // Animate the card deal
    gsap.fromTo(".waste-top-card", 
      { 
        x: -50, 
        opacity: 0,
        rotation: -10
      },
      {
        x: 0,
        opacity: 1,
        rotation: 0,
        duration: 0.3,
        ease: "power2.out"
      }
    );
  };

  const undoLastMove = () => {
    if (moveHistory.length === 0) return;
    
    const lastMove = moveHistory[moveHistory.length - 1];
    const newHistory = moveHistory.slice(0, -1);
    setMoveHistory(newHistory);
    
    if (lastMove.type === 'dealFromStock') {
      // Return the card to the stock
      const newWaste = [...waste];
      const cardToReturn = newWaste.pop();
      if (cardToReturn) {
        cardToReturn.isFlipped = false;
        setStock([...stock, cardToReturn]);
      }
      setWaste(newWaste);
      
      // Animate card going back to stock
      gsap.to(".stock-pile-card", {
        scale: 1.1,
        duration: 0.2,
        yoyo: true,
        repeat: 1
      });
    }
    
    // Handle other move types here when implemented
  };
  
  const showHint = () => {
    // Simple hint animation to highlight potential moves
    // This is a placeholder - in a real game you'd actually calculate valid moves
    
    // Animate waste card if available
    if (waste.length > 0) {
      gsap.to(".waste-top-card", {
        y: -10,
        duration: 0.5,
        yoyo: true,
        repeat: 1
      });
    }
    
    // Animate face-up cards in tableau
    tableauPiles.forEach((pile, i) => {
      if (pile.length > 0 && pile[pile.length - 1].isFlipped) {
        gsap.to(`.tableau-${i}-top`, {
          y: -10,
          duration: 0.5,
          delay: i * 0.1,
          yoyo: true,
          repeat: 1
        });
      }
    });
  };
  
  const startNewGame = () => {
    // Animation for starting a new game
    gsap.to(".card", {
      scale: 0.8,
      opacity: 0,
      stagger: 0.01,
      duration: 0.3,
      onComplete: initializeGame
    });
  };

  return (
    <div className="p-4">
      <div className="max-w-7xl mx-auto">
        {/* Control buttons */}
        <div className="flex justify-center gap-3 mb-4">
          <Button onClick={startNewGame} variant="secondary" className="flex items-center gap-2">
            <RefreshCw size={18} /> New Game
          </Button>
          <Button onClick={undoLastMove} variant="outline" className="flex items-center gap-2">
            <ArrowLeft size={18} /> Undo
          </Button>
          <Button onClick={showHint} variant="outline" className="flex items-center gap-2">
            <RefreshCcw size={18} /> Hint
          </Button>
        </div>
        
        {/* Top row - Stock and Foundation piles */}
        <div className="flex gap-4 mb-8">
          <div className="flex gap-4">
            <div
              className="foundation-pile cursor-pointer"
              onClick={dealFromStock}
            >
              {stock.length > 0 && (
                <Card
                  suit=""
                  value=""
                  isFlipped={false}
                  className="stock-pile-card"
                />
              )}
            </div>
            <div className="foundation-pile">
              {waste.length > 0 && (
                <Card
                  {...waste[waste.length - 1]}
                  className="waste-top-card"
                />
              )}
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex gap-4">
            {foundationPiles.map((pile, index) => (
              <div key={`foundation-${index}`} className="foundation-pile">
                {pile.length > 0 && (
                  <Card {...pile[pile.length - 1]} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tableau piles */}
        <div className="flex gap-4">
          {tableauPiles.map((pile, index) => (
            <div key={`tableau-${index}`} className="tableau-pile">
              {pile.map((card, cardIndex) => (
                <div
                  key={card.id || `${index}-${cardIndex}`}
                  className={`relative ${cardIndex === pile.length - 1 ? `tableau-${index}-top` : ''}`}
                  style={{ marginTop: cardIndex > 0 ? '-100px' : '0' }}
                >
                  <Card {...card} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
