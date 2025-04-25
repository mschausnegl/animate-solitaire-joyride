import React, { useState, useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import Card from './Card';
import { Button } from '@/components/ui/button';
import { RefreshCw, ArrowLeft, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

gsap.registerPlugin(Draggable);

interface CardType {
  suit: string;
  value: string;
  isFlipped: boolean;
  id: string;
  color?: 'red' | 'black';
  rank?: number;
}

const valueRanks: Record<string, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, 
  '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
};

const GameBoard = () => {
  const [deck, setDeck] = useState<CardType[]>([]);
  const [tableauPiles, setTableauPiles] = useState<CardType[][]>(Array(7).fill([]));
  const [foundationPiles, setFoundationPiles] = useState<CardType[][]>(Array(4).fill([]));
  const [stock, setStock] = useState<CardType[]>([]);
  const [waste, setWaste] = useState<CardType[]>([]);
  const [moveHistory, setMoveHistory] = useState<any[]>([]);
  const [hintCard, setHintCard] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [dragSource, setDragSource] = useState<{ type: string; pileIndex: number; cardIndex: number } | null>(null);
  const tableauRefs = useRef<(HTMLDivElement | null)[]>([]);
  const foundationRefs = useRef<(HTMLDivElement | null)[]>([]);
  const wasteRef = useRef<HTMLDivElement | null>(null);

  const initializeGame = useCallback(() => {
    const suits = ['♠', '♥', '♣', '♦'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const newDeck: CardType[] = [];

    suits.forEach(suit => {
      values.forEach(value => {
        const color = (suit === '♥' || suit === '♦') ? 'red' : 'black';
        newDeck.push({ 
          suit, 
          value, 
          isFlipped: false,
          id: `${value}-${suit}-${Math.random().toString(36).substring(2, 9)}`,
          color,
          rank: valueRanks[value]
        });
      });
    });

    const shuffledDeck = [...newDeck].sort(() => Math.random() - 0.5);
    setDeck(shuffledDeck);

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
    setWaste([]);
    setFoundationPiles(Array(4).fill([]));
    setMoveHistory([]);
    setHintCard(null);
    setGameStarted(true);
    
    toast.success("New game started!");
  }, []);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const dealFromStock = () => {
    if (stock.length === 0) {
      setStock(waste.reverse().map(card => ({ ...card, isFlipped: false })));
      setWaste([]);
      
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
      
      setMoveHistory([...moveHistory, {
        type: 'dealFromStock',
        card: dealtCard,
        stockLength: newStock.length,
        wasteLength: waste.length
      }]);
    }
    setStock(newStock);

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

  useEffect(() => {
    const draggableItems = document.querySelectorAll('.draggable-card');
    
    draggableItems.forEach((item) => {
      Draggable.create(item, {
        type: 'x,y',
        onDragStart: function() {
          const element = this.target as HTMLDivElement;
          const sourceInfo = element.dataset.source?.split('-');
          
          if (!sourceInfo) return;
          
          const type = sourceInfo[0];
          const pileIndex = parseInt(sourceInfo[1]);
          const cardIndex = parseInt(sourceInfo[2]);
          
          setDragSource({ type, pileIndex, cardIndex });
          element.classList.add('dragging');
          
          gsap.set(element, { zIndex: 100 });
        },
        onDragEnd: function() {
          const element = this.target as HTMLDivElement;
          element.classList.remove('dragging');
          
          const finalX = this.x;
          const finalY = this.y;
          
          const dropTarget = findDropTarget(finalX, finalY);
          
          if (dropTarget && dragSource) {
            handleCardMove(dragSource, dropTarget);
          }
          
          gsap.to(element, { 
            x: 0, 
            y: 0, 
            duration: 0.3,
            onComplete: () => {
              gsap.set(element, { clearProps: "zIndex" });
            }
          });
          
          setDragSource(null);
        }
      });
    });
  }, [tableauPiles, foundationPiles, waste]);

  const findDropTarget = (x: number, y: number) => {
    for (let i = 0; i < tableauRefs.current.length; i++) {
      const pileEl = tableauRefs.current[i];
      if (pileEl) {
        const rect = pileEl.getBoundingClientRect();
        if (
          x + window.scrollX >= rect.left && 
          x + window.scrollX <= rect.right && 
          y + window.scrollY >= rect.top && 
          y + window.scrollY <= rect.bottom
        ) {
          return { type: 'tableau', pileIndex: i };
        }
      }
    }
    
    for (let i = 0; i < foundationRefs.current.length; i++) {
      const pileEl = foundationRefs.current[i];
      if (pileEl) {
        const rect = pileEl.getBoundingClientRect();
        if (
          x + window.scrollX >= rect.left && 
          x + window.scrollX <= rect.right && 
          y + window.scrollY >= rect.top && 
          y + window.scrollY <= rect.bottom
        ) {
          return { type: 'foundation', pileIndex: i };
        }
      }
    }
    
    return null;
  };

  const handleCardMove = (source: { type: string; pileIndex: number; cardIndex: number }, 
                          target: { type: string; pileIndex: number }) => {
    let cardsToMove: CardType[] = [];
    let sourceCards: CardType[] = [];
    
    if (source.type === 'tableau') {
      sourceCards = [...tableauPiles[source.pileIndex]];
      cardsToMove = sourceCards.slice(source.cardIndex);
    } else if (source.type === 'waste' && waste.length > 0) {
      cardsToMove = [waste[waste.length - 1]];
    } else if (source.type === 'foundation') {
      const foundationPile = foundationPiles[source.pileIndex];
      if (foundationPile.length > 0) {
        cardsToMove = [foundationPile[foundationPile.length - 1]];
      }
    }
    
    if (cardsToMove.length === 0) return;
    
    const isValid = validateMove(cardsToMove, target);
    
    if (isValid) {
      executeMove(source, target, cardsToMove);
      
      setMoveHistory([...moveHistory, {
        type: 'cardMove',
        source,
        target,
        cards: cardsToMove
      }]);
      
      setHintCard(null);
      
      gsap.to(`#${cardsToMove[0].id}`, {
        scale: 1.05,
        duration: 0.2,
        yoyo: true,
        repeat: 1
      });
    } else {
      gsap.to(`#${cardsToMove[0].id}`, {
        x: 10,
        duration: 0.1,
        yoyo: true,
        repeat: 3
      });
      
      toast.error("Invalid move!");
    }
  };

  const validateMove = (cards: CardType[], target: { type: string; pileIndex: number }): boolean => {
    const cardToMove = cards[0];
    
    if (target.type === 'tableau') {
      const targetPile = tableauPiles[target.pileIndex];
      
      if (targetPile.length === 0) {
        return cardToMove.value === 'K';
      }
      
      const targetCard = targetPile[targetPile.length - 1];
      
      return (
        targetCard.isFlipped &&
        cardToMove.color !== targetCard.color && 
        cardToMove.rank === targetCard.rank - 1
      );
    }
    
    if (target.type === 'foundation') {
      const targetPile = foundationPiles[target.pileIndex];
      
      if (cards.length > 1) return false;
      
      if (targetPile.length === 0) {
        return cardToMove.value === 'A';
      }
      
      const targetCard = targetPile[targetPile.length - 1];
      
      return (
        cardToMove.suit === targetCard.suit && 
        cardToMove.rank === targetCard.rank + 1
      );
    }
    
    return false;
  };

  const executeMove = (source: { type: string; pileIndex: number; cardIndex: number }, 
                      target: { type: string; pileIndex: number }, 
                      cards: CardType[]) => {
    if (source.type === 'tableau') {
      const newTableauPiles = [...tableauPiles];
      const sourcePile = [...newTableauPiles[source.pileIndex]];
      
      newTableauPiles[source.pileIndex] = sourcePile.slice(0, source.cardIndex);
      
      if (newTableauPiles[source.pileIndex].length > 0 && 
          !newTableauPiles[source.pileIndex][newTableauPiles[source.pileIndex].length - 1].isFlipped) {
        newTableauPiles[source.pileIndex][newTableauPiles[source.pileIndex].length - 1].isFlipped = true;
      }
      
      if (target.type === 'tableau') {
        newTableauPiles[target.pileIndex] = [...newTableauPiles[target.pileIndex], ...cards];
      } else if (target.type === 'foundation') {
        const newFoundationPiles = [...foundationPiles];
        newFoundationPiles[target.pileIndex] = [...newFoundationPiles[target.pileIndex], cards[0]];
        setFoundationPiles(newFoundationPiles);
      }
      
      setTableauPiles(newTableauPiles);
    } 
    else if (source.type === 'waste') {
      const newWaste = [...waste];
      newWaste.pop();
      setWaste(newWaste);
      
      if (target.type === 'tableau') {
        const newTableauPiles = [...tableauPiles];
        newTableauPiles[target.pileIndex] = [...newTableauPiles[target.pileIndex], cards[0]];
        setTableauPiles(newTableauPiles);
      } else if (target.type === 'foundation') {
        const newFoundationPiles = [...foundationPiles];
        newFoundationPiles[target.pileIndex] = [...newFoundationPiles[target.pileIndex], cards[0]];
        setFoundationPiles(newFoundationPiles);
      }
    }
    else if (source.type === 'foundation') {
      const newFoundationPiles = [...foundationPiles];
      newFoundationPiles[source.pileIndex].pop();
      setFoundationPiles(newFoundationPiles);
      
      if (target.type === 'tableau') {
        const newTableauPiles = [...tableauPiles];
        newTableauPiles[target.pileIndex] = [...newTableauPiles[target.pileIndex], cards[0]];
        setTableauPiles(newTableauPiles);
      }
    }
    
    checkForWin();
  };

  const checkForWin = () => {
    const isWin = foundationPiles.every(pile => pile.length === 13);
    
    if (isWin) {
      toast.success("Congratulations! You won the game!");
      
      gsap.to(".card", {
        y: -20,
        stagger: 0.05,
        duration: 0.3,
        yoyo: true,
        repeat: 3,
        ease: "elastic"
      });
    }
  };

  const undoLastMove = () => {
    if (moveHistory.length === 0) {
      toast.info("Nothing to undo");
      return;
    }
    
    const lastMove = moveHistory[moveHistory.length - 1];
    const newHistory = moveHistory.slice(0, -1);
    setMoveHistory(newHistory);
    
    if (lastMove.type === 'dealFromStock') {
      const newWaste = [...waste];
      const cardToReturn = newWaste.pop();
      if (cardToReturn) {
        cardToReturn.isFlipped = false;
        setStock([...stock, cardToReturn]);
      }
      setWaste(newWaste);
      
      gsap.to(".stock-pile-card", {
        scale: 1.1,
        duration: 0.2,
        yoyo: true,
        repeat: 1
      });
      
      toast.info("Move undone");
    } 
    else if (lastMove.type === 'cardMove') {
      const { source, target, cards } = lastMove;
      
      if (target.type === 'tableau') {
        const newTableauPiles = [...tableauPiles];
        const targetPile = newTableauPiles[target.pileIndex];
        newTableauPiles[target.pileIndex] = targetPile.slice(0, targetPile.length - cards.length);
        
        if (source.type === 'tableau') {
          const sourcePile = newTableauPiles[source.pileIndex];
          if (sourcePile.length > 0) {
            sourcePile[sourcePile.length - 1].isFlipped = false;
          }
          newTableauPiles[source.pileIndex] = [...sourcePile, ...cards];
          setTableauPiles(newTableauPiles);
        } 
        else if (source.type === 'waste') {
          setWaste([...waste, cards[0]]);
          setTableauPiles(newTableauPiles);
        }
        else if (source.type === 'foundation') {
          const newFoundationPiles = [...foundationPiles];
          newFoundationPiles[source.pileIndex] = [...newFoundationPiles[source.pileIndex], cards[0]];
          setFoundationPiles(newFoundationPiles);
          setTableauPiles(newTableauPiles);
        }
      } 
      else if (target.type === 'foundation') {
        const newFoundationPiles = [...foundationPiles];
        newFoundationPiles[target.pileIndex].pop();
        
        if (source.type === 'tableau') {
          const newTableauPiles = [...tableauPiles];
          if (newTableauPiles[source.pileIndex].length > 0) {
            const lastCard = newTableauPiles[source.pileIndex][newTableauPiles[source.pileIndex].length - 1];
            if (lastCard.isFlipped) {
              lastCard.isFlipped = false;
            }
          }
          newTableauPiles[source.pileIndex] = [...newTableauPiles[source.pileIndex], cards[0]];
          setTableauPiles(newTableauPiles);
        } 
        else if (source.type === 'waste') {
          setWaste([...waste, cards[0]]);
        }
        
        setFoundationPiles(newFoundationPiles);
      }
      
      toast.info("Move undone");
    }
    
    setHintCard(null);
  };

  const showHint = () => {
    let moveFound = false;
    
    if (waste.length > 0) {
      const wasteCard = waste[waste.length - 1];
      
      for (let i = 0; i < tableauPiles.length; i++) {
        const targetPile = tableauPiles[i];
        if (targetPile.length === 0) {
          if (wasteCard.value === 'K') {
            setHintCard(wasteCard.id);
            moveFound = true;
            break;
          }
        } else {
          const targetCard = targetPile[targetPile.length - 1];
          if (targetCard.isFlipped && 
              wasteCard.color !== targetCard.color && 
              wasteCard.rank === targetCard.rank - 1) {
            setHintCard(wasteCard.id);
            moveFound = true;
            break;
          }
        }
      }
      
      if (!moveFound) {
        for (let i = 0; i < foundationPiles.length; i++) {
          const targetPile = foundationPiles[i];
          if (targetPile.length === 0) {
            if (wasteCard.value === 'A') {
              setHintCard(wasteCard.id);
              moveFound = true;
              break;
            }
          } else {
            const targetCard = targetPile[targetPile.length - 1];
            if (wasteCard.suit === targetCard.suit && 
                wasteCard.rank === targetCard.rank + 1) {
              setHintCard(wasteCard.id);
              moveFound = true;
              break;
            }
          }
        }
      }
    }
    
    if (!moveFound) {
      for (let i = 0; i < tableauPiles.length; i++) {
        const sourcePile = tableauPiles[i];
        if (sourcePile.length === 0) continue;
        
        for (let j = 0; j < sourcePile.length; j++) {
          if (!sourcePile[j].isFlipped) continue;
          
          const cardToMove = sourcePile[j];
          
          for (let k = 0; k < tableauPiles.length; k++) {
            if (k === i) continue;
            
            const targetPile = tableauPiles[k];
            if (targetPile.length === 0) {
              if (cardToMove.value === 'K') {
                setHintCard(cardToMove.id);
                moveFound = true;
                break;
              }
            } else {
              const targetCard = targetPile[targetPile.length - 1];
              if (targetCard.isFlipped && 
                  cardToMove.color !== targetCard.color && 
                  cardToMove.rank === targetCard.rank - 1) {
                setHintCard(cardToMove.id);
                moveFound = true;
                break;
              }
            }
          }
          
          if (moveFound) break;
          
          for (let k = 0; k < foundationPiles.length; k++) {
            const targetPile = foundationPiles[k];
            if (j === sourcePile.length - 1) {
              if (targetPile.length === 0) {
                if (cardToMove.value === 'A') {
                  setHintCard(cardToMove.id);
                  moveFound = true;
                  break;
                }
              } else {
                const targetCard = targetPile[targetPile.length - 1];
                if (cardToMove.suit === targetCard.suit && 
                    cardToMove.rank === targetCard.rank + 1) {
                  setHintCard(cardToMove.id);
                  moveFound = true;
                  break;
                }
              }
            }
          }
          
          if (moveFound) break;
        }
        
        if (moveFound) break;
      }
    }
    
    if (moveFound) {
      gsap.to(`#${hintCard}`, {
        y: -10,
        duration: 0.5,
        yoyo: true,
        repeat: 3,
        ease: "bounce.out"
      });
      
      setTimeout(() => {
        setHintCard(null);
      }, 3000);
    } else {
      toast.info("No hints available. Try dealing from stock.");
    }
  };

  const startNewGame = () => {
    gsap.to(".card", {
      scale: 0.8,
      opacity: 0,
      stagger: 0.01,
      duration: 0.3,
      onComplete: initializeGame
    });
  };

  useEffect(() => {
    tableauRefs.current = tableauRefs.current.slice(0, 7);
    foundationRefs.current = foundationRefs.current.slice(0, 4);
  }, []);

  const handleCardClick = (sourceType: string, pileIndex: number, cardIndex: number) => {
    if (sourceType === 'stock') {
      dealFromStock();
      return;
    }
    
    if (sourceType === 'tableau') {
      const pile = tableauPiles[pileIndex];
      if (cardIndex !== pile.length - 1 || !pile[cardIndex].isFlipped) return;
    }
    
    if ((sourceType === 'tableau' && cardIndex === tableauPiles[pileIndex].length - 1) || sourceType === 'waste') {
      let card: CardType;
      
      if (sourceType === 'tableau') {
        card = tableauPiles[pileIndex][cardIndex];
      } else {
        if (waste.length === 0) return;
        card = waste[waste.length - 1];
      }
      
      for (let i = 0; i < foundationPiles.length; i++) {
        const target = { type: 'foundation', pileIndex: i };
        const isValid = validateMove([card], target);
        
        if (isValid) {
          const source = { 
            type: sourceType, 
            pileIndex, 
            cardIndex: sourceType === 'tableau' ? cardIndex : waste.length - 1 
          };
          
          handleCardMove(source, target);
          return;
        }
      }
      
      if (sourceType === 'tableau') {
        for (let i = 0; i < tableauPiles.length; i++) {
          if (i === pileIndex) continue;
          
          const target = { type: 'tableau', pileIndex: i };
          const card = tableauPiles[pileIndex][cardIndex];
          const isValid = validateMove([card], target);
          
          if (isValid) {
            const source = { type: sourceType, pileIndex, cardIndex };
            handleCardMove(source, target);
            return;
          }
        }
      } else if (sourceType === 'waste') {
        for (let i = 0; i < tableauPiles.length; i++) {
          const target = { type: 'tableau', pileIndex: i };
          const card = waste[waste.length - 1];
          const isValid = validateMove([card], target);
          
          if (isValid) {
            const source = { type: sourceType, pileIndex: 0, cardIndex: waste.length - 1 };
            handleCardMove(source, target);
            return;
          }
        }
      }
    }
  };

  return (
    <div className="p-4">
      <div className="max-w-7xl mx-auto">
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
        
        <div className="flex gap-4 mb-8">
          <div className="flex gap-4">
            <div
              className="foundation-pile cursor-pointer"
              onClick={() => dealFromStock()}
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
            <div 
              className="foundation-pile"
              ref={wasteRef}
            >
              {waste.length > 0 && (
                <Card
                  {...waste[waste.length - 1]}
                  className={`waste-top-card draggable-card ${hintCard === waste[waste.length - 1].id ? 'card-highlight' : ''}`}
                  onClick={() => handleCardClick('waste', 0, waste.length - 1)}
                  data-source={`waste-0-${waste.length - 1}`}
                  id={waste[waste.length - 1].id}
                />
              )}
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex gap-4">
            {foundationPiles.map((pile, index) => (
              <div 
                key={`foundation-${index}`} 
                className="foundation-pile"
                ref={el => foundationRefs.current[index] = el}
              >
                {pile.length > 0 && (
                  <Card 
                    {...pile[pile.length - 1]} 
                    className={`draggable-card ${hintCard === pile[pile.length - 1].id ? 'card-highlight' : ''}`}
                    data-source={`foundation-${index}-${pile.length - 1}`}
                    onClick={() => handleCardClick('foundation', index, pile.length - 1)}
                    id={pile[pile.length - 1].id}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          {tableauPiles.map((pile, pileIndex) => (
            <div 
              key={`tableau-${pileIndex}`} 
              className="tableau-pile"
              ref={el => tableauRefs.current[pileIndex] = el}
            >
              {pile.map((card, cardIndex) => (
                <div
                  key={card.id}
                  className={`relative ${cardIndex === pile.length - 1 ? `tableau-${pileIndex}-top` : ''}`}
                  style={{ marginTop: cardIndex > 0 ? '-100px' : '0' }}
                >
                  <Card 
                    {...card} 
                    className={`${card.isFlipped ? 'draggable-card' : ''} ${hintCard === card.id ? 'card-highlight' : ''}`}
                    onClick={() => handleCardClick('tableau', pileIndex, cardIndex)}
                    data-source={card.isFlipped ? `tableau-${pileIndex}-${cardIndex}` : undefined}
                    id={card.id}
                  />
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
