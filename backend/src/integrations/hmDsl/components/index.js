"use strict";
/**
 * 组件注册表。
 *
 * 新增组件只需要：
 *   1. 在本目录新建一个 .js（导出 (props, childrenHtml, ctx) => htmlString）
 *   2. 在下方 require + 加入 registry
 */

const FullscreenPanel = require("./FullscreenPanel");
const StatusBar = require("./StatusBar");
const NavBar = require("./NavBar");
const SegmentedTabs = require("./SegmentedTabs");
const Grid = require("./Grid");
const IconCard = require("./IconCard");
const Icon = require("./Icon");
const Column = require("./Column");
const OverlayMask = require("./OverlayMask");
const Spinner = require("./Spinner");
const Banner = require("./Banner");
const Badge = require("./Badge");
const Checkbox = require("./Checkbox");
const ListItem = require("./ListItem");
const Button = require("./Button");
const Text = require("./Text");
const Row = require("./Row");
const TextInput = require("./TextInput");
const FieldError = require("./FieldError");
const FormField = require("./FormField");
const Image = require("./Image");
const BottomTab = require("./BottomTab");

module.exports = {
  Page: FullscreenPanel,                 // Page 是 FullscreenPanel 的语义化别名
  FullscreenPanel,
  StatusBar,
  BottomTab,
  NavBar,
  SegmentedTabs,
  Grid,
  IconCard,
  Icon,
  Column,
  Row,
  OverlayMask,
  Spinner,
  Banner,
  Badge,
  Checkbox,
  ListItem,
  Button,
  Text,
  TextInput,
  FormField,
  FieldError,
  Image,
};
