"use client";

import { Button, Flex, Heading, Text, chakra } from "@chakra-ui/react";
import React from "react";
import FooterTopSVG from "./FooterTopSVG";
import FooterBg from "./FooterBg";
import { LuArrowRight } from "react-icons/lu";
import { motion, HTMLMotionProps } from "framer-motion";

// Create a custom motion component that combines Chakra Button and motion
const MotionBox = chakra(motion.div);
const MotionLink = motion(chakra.a as any);

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

const Footer = () => {
  return (
    <Flex
      py={32}
      position={"relative"}
      justify={"center"}
      align={"center"}
      direction={"column"}
      id="footer"
    >
      <FooterTopSVG />
      <FooterBg />
      <Flex mt={16} direction={"column"} align={"center"} px={2}>
        <Flex bg={"#ffffff50"} pr={4} rounded={"full"} mb={5}>
          <Text color={StargateColors.white} fontSize={"xs"}>
            <Text
              as="span"
              fontWeight={600}
              bg={"#ffffff50"}
              px={2}
              rounded={"full"}
              mr={1}
            >
              Stargate
            </Text>{" "}
            The only AI tool you will ever need
          </Text>
        </Flex>
        <Heading
          fontSize={{
            base: 72,
            md: 96,
          }}
          textAlign={"center"}
          color="transparent"
          maxW={500}
          fontWeight={800}
          style={{
            backgroundImage: "linear-gradient(315deg, #ffffff 60%, #000000)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
          }}
        >
          Fork me on GitHub
        </Heading>

        <MotionLink
          href="https://github.com/kisbalazspatrik/nextjs-saas-landing"
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.1 }}
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          bg="blue.500"
          color="white"
          px={6}
          py={3}
          rounded="md"
          fontWeight="semibold"
          mt={5}
          gap={2}
          cursor="pointer"
          _hover={{ textDecoration: 'none' }}
        >
          Get Started
          <LuArrowRight style={{ marginLeft: '8px' }} />
        </MotionLink>
      </Flex>

      <Flex mt={32}>
        <Text color={StargateColors.white}>
          {new Date().getFullYear()} - All rights reserved
        </Text>
      </Flex>
    </Flex>
  );
};

export default Footer;
