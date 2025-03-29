import { FoodSpinnerContainer } from './_components/food-spinner-container';

export default function FoodSpinnerPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-8 text-3xl font-bold">吃啥转转</h1>
      <p className="mb-8 text-muted-foreground">
        再也不用为「今天吃什么」而烦恼！筛选喜欢的美食种类，让转盘来决定你的命运！
      </p>

      <FoodSpinnerContainer />
    </div>
  );
}
