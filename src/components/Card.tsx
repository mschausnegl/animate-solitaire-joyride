
import React from 'react';
import { cn } from "@/lib/utils";

interface CardProps {
  suit: string;
  value: string;
  isFlipped: boolean;
  onClick?: () => void;
  className?: string;
  id?: string;
  "data-source"?: string;
}

const Card = ({ suit, value, isFlipped, onClick, className, id, "data-source": dataSource }: CardProps) => {
  const suitColor = suit === '♥' || suit === '♦' ? 'text-red-600' : 'text-black';

  return (
    <div 
      className={cn("card", isFlipped && "flipped", className)} 
      onClick={onClick}
      id={id}
      data-source={dataSource}
    >
      <div className="card-inner">
        <div className={cn("card-back")} />
        <div className={cn("card-front flex flex-col justify-between p-2", suitColor)}>
          <div className="text-left text-xl">{value}</div>
          <div className="text-center text-4xl">{suit}</div>
          <div className="text-right text-xl rotate-180">{value}</div>
        </div>
      </div>
    </div>
  );
};

export default Card;
