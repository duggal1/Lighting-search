
import { Icon } from "@chakra-ui/react";
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
//

const FooterTopSVG = () => {
  return (
    <Icon
      viewBox="0 0 1440 52"
      fill={StargateColors.white}
      w={"100%"}
      h={"auto"}
      position={"absolute"}
      top={"-1px"}
      left={0}
      overflow={"hidden"}
      transform={"rotate(180deg)"}
      zIndex={-1}
    >
      <path d="M0,0c240,34.3,480,51.5,720,51.5S1200,34.3,1440,0v52H0V0z" />
    </Icon>
  );
};

export default FooterTopSVG;
