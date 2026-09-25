import {
  Blocks,
  BookOpen,
  CheckCheck,
  Layers,
  LayoutDashboard,
  MousePointer2,
  SlidersHorizontal,
  Shapes,
  Table2,
  TrendingUp,
  WandSparkles,
} from "lucide-react";
import { widgetIndex } from "../../widgets/widget-index.js";
import { BACKOFFICE_PERMISSIONS as P } from "../../platform/backoffice-permissions.js";

const categoryIcons = {
  Foundations: Shapes,
  Data: Table2,
  Charts: TrendingUp,
  Cards: Layers,
  Actions: MousePointer2,
  Forms: SlidersHorizontal,
  Navigation: Blocks,
  Feedback: CheckCheck,
};
const link = (path, label, icon, keywords = []) => ({
  to: path,
  label,
  icon,
  keywords,
  permission: P.WidgetsView,
});
export const WIDGET_NAV = {
  id: "cloudgate-widgets",
  label: "Widget library",
  icon: Blocks,
  section: "platform",
  keywords: ["components", "design system"],
  children: [
    { ...link("/widgets", "Overview", LayoutDashboard), end: true },
    ...Object.entries(categoryIcons).map(([category, icon]) => ({
      id: `widgets-${category.toLowerCase()}`,
      label: category,
      icon,
      children: widgetIndex
        .filter((widget) => widget.category === category)
        .map((widget) =>
          link(`/widgets/${widget.id}`, widget.name, icon, [
            widget.id,
            ...(widget.id === "data-table"
              ? ["lazy loading", "pagination", "sorting", "filtering"]
              : []),
            ...(widget.id === "dialog" ? ["modal"] : []),
            ...(widget.id === "select" ? ["dropdown"] : []),
            ...(widget.id === "icons" ? ["icons", "symbols", "lucide", "svg"] : []),
          ]),
        ),
    })),
    link("/widgets/recipes", "Recipes", WandSparkles),
    link("/widgets/guidelines", "Usage guide", BookOpen),
  ],
};
