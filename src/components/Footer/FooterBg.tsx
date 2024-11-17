
import { Box } from "@chakra-ui/react";
import React from "react";
export const StargateColors = {
  primary: "#e340bf",
  secondary: "#a440e3",
  grey: "#656f7e",
  black: "#09090b",
  darkBg: "#262626",
  white: "#FFFFFF",
  lightBg: "#d9d9d9",
  lightGrey: "#f2f2f2",
};

const FooterBg = () => {
  const baseStyle = `${StargateColors.primary},${StargateColors.secondary}75, transparent, transparent, transparent`;

  return (
    <Box
      position={"absolute"}
      inset={0}
      zIndex={-2}
      bg={{
        base: `
        radial-gradient(circle at 100% -40%, ${baseStyle}), 
        radial-gradient(circle at 50% -60%, ${baseStyle}),
        radial-gradient(circle at 0% -40%, ${baseStyle}),
        black
        `,
        md: `
        radial-gradient(circle at 100% -50%, ${baseStyle}), 
        radial-gradient(circle at 15% -75%, ${baseStyle}),
        black
        `,
      }}
    />
  );
};

export default FooterBg;
