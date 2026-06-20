import type { ComponentType } from "react";
import type { ModuleType } from "@/lib/types";
import HoleShaftFit from "./HoleShaftFit";
import ThreadFit from "./ThreadFit";
import BoltTorque from "./BoltTorque";
import LinearStack from "./LinearStack";
import ToleranceAllocation from "./ToleranceAllocation";
import PressFit from "./PressFit";

/** Props a saveable module accepts. Tools that don't persist simply ignore them. */
export interface CalculatorProps {
  initialState?: Record<string, unknown>;
  onStateChange?: (state: Record<string, unknown>) => void;
}

export const CALCULATORS: Record<ModuleType, ComponentType<CalculatorProps>> = {
  hole_shaft_fit: HoleShaftFit,
  thread_fit: ThreadFit,
  bolt_torque: BoltTorque,
  linear_stack: LinearStack,
  tolerance_allocation: ToleranceAllocation,
  press_fit: PressFit,
};
