import { AnimatedGroup } from "./motion-primitives/animated-group";

const LoadingPage = () => {
  return (
    <AnimatedGroup
      className="flex flex-col items-center justify-center h-screen"
      preset="scale"
    >
      <span className="loading loading-dots loading-xs"></span>
      <span className="loading loading-dots loading-sm"></span>
      <span className="loading loading-dots loading-md"></span>
      <span className="loading loading-dots loading-lg"></span>
      <span className="loading loading-dots loading-xl"></span>
    </AnimatedGroup>
  );
};

export default LoadingPage;
