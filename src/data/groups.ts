export interface Group {
  id: number;
  name: string;
  description: string;
  icon: string;
  link?: string;
}

export const groups: Group[] = [
  {
    id: 1,
    name: "Grupo Alpha VIP",
    description: "Networking de alto nível & vendas.",
    icon: "diamond",
    link: "https://chat.whatsapp.com/example1"
  },
  {
    id: 2,
    name: "Lançamentos 2024",
    description: "Updates diários e materiais.",
    icon: "rocket_launch",
    link: "https://chat.whatsapp.com/example2"
  },
  {
    id: 3,
    name: "Black Elite Club",
    description: "Mentoria exclusiva para membros.",
    icon: "crown",
    link: "https://chat.whatsapp.com/example3"
  },
  {
    id: 4,
    name: "Mastermind 100k",
    description: "Estratégias avançadas de escala.",
    icon: "stars",
    link: "https://chat.whatsapp.com/example4"
  },
];
