
import React, { useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import Card from './Card';

gsap.registerPlugin(Draggable);

interface CardType {
  suit: string;
  value: string;
  isFlipped: boolean;
}

const GameBoard = () => {
  const [deck, setDeck] = useState<CardType[]>([]);
  const [tableauPiles, setTableauPiles] = useState<CardType[][]>(Array(7).fill([]));
  const [foundationPiles, setFoundationPiles] = useState<CardType[][]>(Array(4).fill([]));
  const [stock, setStock] = useState<CardType[]>([]);
  const [waste, setWaste] = useState<CardType[]>([]);

  useEffect(() => {
    initializeGame();
  }, []);

  const initializeGame = () => {
    const suits = ['♠', '♥', '♣', '♦'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const newDeck: CardType[] = [];

    suits.forEach(suit => {
      values.forEach(value => {
        newDeck.push({ suit, value, isFlipped: false });
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
          isFlipped: j === i
        }];
        cardIndex++;
      }
    }

    setTableauPiles(newTableauPiles);
    setStock(shuffledDeck.slice(28));
  };

  const dealFromStock = () => {
    if (stock.length === 0) {
      // Reset stock from waste
      setStock(waste.reverse().map(card => ({ ...card, isFlipped: false })));
      setWaste([]);
      return;
    }

    const newStock = [...stock];
    const dealtCard = newStock.pop();
    if (dealtCard) {
      dealtCard.isFlipped = true;
      setWaste([...waste, dealtCard]);
    }
    setStock(newStock);

    // Animate the card deal
    gsap.from(".waste-top-card", {
      x: -50,
      rotation: -10,
      duration: 0.3,
      ease: "power2.out"
    });
  };

  return (
    <div className="p-4">
      <div className="max-w-7xl mx-auto">
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
                  className="absolute"
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
              <div key={index} className="foundation-pile">
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
            <div key={index} className="tableau-pile">
              {pile.map((card, cardIndex) => (
                <div
                  key={cardIndex}
                  className="relative"
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
