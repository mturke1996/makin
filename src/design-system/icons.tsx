/**
 * Every icon the app draws, in one place: Phosphor glyphs (Linda Shop's set), one Regular weight.
 *
 * The export names are the Material names the screens already use (`Home`, `ReceiptLong`, ...), so a
 * screen picks an icon by meaning and never imports an icon library directly. `sx={{ fontSize }}`,
 * `fontSize="small"` and `className` keep working. Icons are decorative by default (`aria-hidden`);
 * a control that has only an icon carries its own label.
 */
import { forwardRef, type CSSProperties } from 'react';
import type { Icon as PhosphorIcon, IconProps } from '@phosphor-icons/react';
import {
  AppWindow as PhAppWindow,
  Archive as PhArchive,
  ArrowCounterClockwise as PhArrowCounterClockwise,
  ArrowDown as PhArrowDown,
  ArrowDownRight as PhArrowDownRight,
  ArrowLeft as PhArrowLeft,
  ArrowRight as PhArrowRight,
  ArrowSquareOut as PhArrowSquareOut,
  ArrowUp as PhArrowUp,
  ArrowUpRight as PhArrowUpRight,
  ArrowsClockwise as PhArrowsClockwise,
  Backspace as PhBackspace,
  Bank as PhBank,
  Basket as PhBasket,
  Bell as PhBell,
  BellRinging as PhBellRinging,
  Buildings as PhBuildings,
  Calculator as PhCalculator,
  CalendarBlank as PhCalendarBlank,
  CalendarX as PhCalendarX,
  CaretDown as PhCaretDown,
  CaretLeft as PhCaretLeft,
  CaretRight as PhCaretRight,
  ChartLine as PhChartLine,
  ChartLineUp as PhChartLineUp,
  Check as PhCheck,
  CheckCircle as PhCheckCircle,
  Checks as PhChecks,
  ClipboardText as PhClipboardText,
  ClockCounterClockwise as PhClockCounterClockwise,
  CloudArrowUp as PhCloudArrowUp,
  CloudCheck as PhCloudCheck,
  CloudSlash as PhCloudSlash,
  Copy as PhCopy,
  CreditCard as PhCreditCard,
  DeviceMobile as PhDeviceMobile,
  DotsNine as PhDotsNine,
  DotsThree as PhDotsThree,
  DotsThreeVertical as PhDotsThreeVertical,
  DownloadSimple as PhDownloadSimple,
  Envelope as PhEnvelope,
  Export as PhExport,
  Eye as PhEye,
  EyeSlash as PhEyeSlash,
  FilePdf as PhFilePdf,
  FilePlus as PhFilePlus,
  FileText as PhFileText,
  Flag as PhFlag,
  FunnelX as PhFunnelX,
  Gear as PhGear,
  HandCoins as PhHandCoins,
  HandWaving as PhHandWaving,
  HardHat as PhHardHat,
  Hourglass as PhHourglass,
  House as PhHouse,
  Info as PhInfo,
  Lightning as PhLightning,
  List as PhList,
  Lock as PhLock,
  MagnifyingGlass as PhMagnifyingGlass,
  MapPin as PhMapPin,
  Minus as PhMinus,
  MinusCircle as PhMinusCircle,
  Money as PhMoney,
  Moon as PhMoon,
  NotePencil as PhNotePencil,
  Package as PhPackage,
  Paperclip as PhPaperclip,
  PencilSimple as PhPencilSimple,
  Percent as PhPercent,
  Phone as PhPhone,
  Plus as PhPlus,
  PlusCircle as PhPlusCircle,
  PlusSquare as PhPlusSquare,
  Printer as PhPrinter,
  Receipt as PhReceipt,
  Scales as PhScales,
  ShareNetwork as PhShareNetwork,
  Shield as PhShield,
  ShieldCheck as PhShieldCheck,
  SignOut as PhSignOut,
  SlidersHorizontal as PhSlidersHorizontal,
  Star as PhStar,
  Sun as PhSun,
  Table as PhTable,
  Trash as PhTrash,
  TrendDown as PhTrendDown,
  UploadSimple as PhUploadSimple,
  User as PhUser,
  UserGear as PhUserGear,
  UserMinus as PhUserMinus,
  UserPlus as PhUserPlus,
  Users as PhUsers,
  UsersThree as PhUsersThree,
  Wallet as PhWallet,
  Warning as PhWarning,
  WarningCircle as PhWarningCircle,
  WhatsappLogo as PhWhatsappLogo,
  WifiSlash as PhWifiSlash,
  X as PhX,
  XCircle as PhXCircle,
} from '@phosphor-icons/react/dist/ssr';

const SIZES = { inherit: '1em', small: 20, medium: 24, large: 35 } as const;

export interface AppIconProps extends Omit<IconProps, 'size' | 'weight' | 'color'> {
  /** Material-style size hook: only `fontSize` and `color` are honoured. */
  sx?: { fontSize?: number | string; color?: string; [key: string]: unknown };
  fontSize?: keyof typeof SIZES;
  color?: string;
}

function glyph(Glyph: PhosphorIcon, name: string) {
  const AppIcon = forwardRef<SVGSVGElement, AppIconProps>(function AppIcon({ sx, fontSize = 'medium', color, style, ...rest }, ref) {
    const merged: CSSProperties = { flexShrink: 0, ...style };
    return (
      <Glyph
        ref={ref}
        size={(sx?.fontSize as number | string | undefined) ?? SIZES[fontSize]}
        weight="regular"
        color={sx?.color ?? color ?? 'currentColor'}
        aria-hidden={rest['aria-label'] ? undefined : true}
        style={merged}
        {...rest}
      />
    );
  });
  AppIcon.displayName = name;
  return AppIcon;
}

export type IconComponent = ReturnType<typeof glyph>;

export const AccountBalance = glyph(PhBank, 'AccountBalance');
export const AccountBalanceWallet = glyph(PhWallet, 'AccountBalanceWallet');
export const Add = glyph(PhPlus, 'Add');
export const AddBoxOutlined = glyph(PhPlusSquare, 'AddBoxOutlined');
export const AddCircleOutline = glyph(PhPlusCircle, 'AddCircleOutline');
export const Archive = glyph(PhArchive, 'Archive');
export const ArrowBack = glyph(PhArrowLeft, 'ArrowBack');
export const ArrowDownward = glyph(PhArrowDown, 'ArrowDownward');
export const ArrowForward = glyph(PhArrowRight, 'ArrowForward');
export const ArrowUpward = glyph(PhArrowUp, 'ArrowUpward');
export const Assignment = glyph(PhClipboardText, 'Assignment');
export const AttachFile = glyph(PhPaperclip, 'AttachFile');
export const Backspace = glyph(PhBackspace, 'Backspace');
export const Balance = glyph(PhScales, 'Balance');
export const Bolt = glyph(PhLightning, 'Bolt');
export const Brightness4 = glyph(PhMoon, 'Brightness4');
export const Brightness7 = glyph(PhSun, 'Brightness7');
export const Business = glyph(PhBuildings, 'Business');
export const Calculate = glyph(PhCalculator, 'Calculate');
export const CalendarToday = glyph(PhCalendarBlank, 'CalendarToday');
export const CallOutlined = glyph(PhPhone, 'CallOutlined');
export const CancelOutlined = glyph(PhXCircle, 'CancelOutlined');
export const Check = glyph(PhCheck, 'Check');
export const CheckCircle = glyph(PhCheckCircle, 'CheckCircle');
export const CheckCircleOutline = glyph(PhCheckCircle, 'CheckCircleOutline');
export const ChevronLeft = glyph(PhCaretLeft, 'ChevronLeft');
export const ChevronRight = glyph(PhCaretRight, 'ChevronRight');
export const Close = glyph(PhX, 'Close');
export const CloudDone = glyph(PhCloudCheck, 'CloudDone');
export const CloudOff = glyph(PhCloudSlash, 'CloudOff');
export const CloudUpload = glyph(PhCloudArrowUp, 'CloudUpload');
export const ContentCopy = glyph(PhCopy, 'ContentCopy');
export const CreditCard = glyph(PhCreditCard, 'CreditCard');
export const Delete = glyph(PhTrash, 'Delete');
export const DeleteOutline = glyph(PhTrash, 'DeleteOutline');
export const Description = glyph(PhFileText, 'Description');
export const DescriptionOutlined = glyph(PhFileText, 'DescriptionOutlined');
export const Dialpad = glyph(PhDotsNine, 'Dialpad');
export const DoneAll = glyph(PhChecks, 'DoneAll');
export const Download = glyph(PhDownloadSimple, 'Download');
export const Edit = glyph(PhPencilSimple, 'Edit');
export const EditNote = glyph(PhNotePencil, 'EditNote');
export const EditOutlined = glyph(PhPencilSimple, 'EditOutlined');
export const Engineering = glyph(PhHardHat, 'Engineering');
export const Error = glyph(PhWarningCircle, 'Error');
export const ErrorOutline = glyph(PhWarningCircle, 'ErrorOutline');
export const EventBusy = glyph(PhCalendarX, 'EventBusy');
export const EventOutlined = glyph(PhCalendarBlank, 'EventOutlined');
export const ExpandMore = glyph(PhCaretDown, 'ExpandMore');
export const FileDownload = glyph(PhDownloadSimple, 'FileDownload');
export const FilterAltOff = glyph(PhFunnelX, 'FilterAltOff');
export const Flag = glyph(PhFlag, 'Flag');
export const GetApp = glyph(PhDownloadSimple, 'GetApp');
export const Groups = glyph(PhUsersThree, 'Groups');
export const History = glyph(PhClockCounterClockwise, 'History');
export const HourglassEmpty = glyph(PhHourglass, 'HourglassEmpty');
export const Home = glyph(PhHouse, 'Home');
export const Info = glyph(PhInfo, 'Info');
export const InfoOutlined = glyph(PhInfo, 'InfoOutlined');
export const Insights = glyph(PhChartLineUp, 'Insights');
export const InstallDesktop = glyph(PhAppWindow, 'InstallDesktop');
export const Inventory2 = glyph(PhPackage, 'Inventory2');
export const IosShare = glyph(PhExport, 'IosShare');
export const LocationOn = glyph(PhMapPin, 'LocationOn');
export const Lock = glyph(PhLock, 'Lock');
export const LockOutlined = glyph(PhLock, 'LockOutlined');
export const Logout = glyph(PhSignOut, 'Logout');
export const Mail = glyph(PhEnvelope, 'Mail');
export const MailOutline = glyph(PhEnvelope, 'MailOutline');
export const ManageAccounts = glyph(PhUserGear, 'ManageAccounts');
export const Menu = glyph(PhList, 'Menu');
export const MoreHoriz = glyph(PhDotsThree, 'MoreHoriz');
export const MoreVert = glyph(PhDotsThreeVertical, 'MoreVert');
export const NorthEast = glyph(PhArrowUpRight, 'NorthEast');
export const Notifications = glyph(PhBell, 'Notifications');
export const NotificationsActive = glyph(PhBellRinging, 'NotificationsActive');
export const NotificationsNone = glyph(PhBell, 'NotificationsNone');
export const OpenInBrowser = glyph(PhArrowSquareOut, 'OpenInBrowser');
export const OpenInNew = glyph(PhArrowSquareOut, 'OpenInNew');
export const Payment = glyph(PhCreditCard, 'Payment');
export const Payments = glyph(PhMoney, 'Payments');
export const PaymentsOutlined = glyph(PhMoney, 'PaymentsOutlined');
export const People = glyph(PhUsers, 'People');
export const PeopleOutline = glyph(PhUsers, 'PeopleOutline');
export const Percent = glyph(PhPercent, 'Percent');
export const Person = glyph(PhUser, 'Person');
export const PersonAdd = glyph(PhUserPlus, 'PersonAdd');
export const PersonAddAlt1 = glyph(PhUserPlus, 'PersonAddAlt1');
export const PersonOff = glyph(PhUserMinus, 'PersonOff');
export const PersonOffOutlined = glyph(PhUserMinus, 'PersonOffOutlined');
export const PersonOutline = glyph(PhUser, 'PersonOutline');
export const Phone = glyph(PhPhone, 'Phone');
export const PhoneAndroid = glyph(PhDeviceMobile, 'PhoneAndroid');
export const PhoneEnabled = glyph(PhPhone, 'PhoneEnabled');
export const PictureAsPdf = glyph(PhFilePdf, 'PictureAsPdf');
export const PictureAsPdfOutlined = glyph(PhFilePdf, 'PictureAsPdfOutlined');
export const PlaceOutlined = glyph(PhMapPin, 'PlaceOutlined');
export const PostAdd = glyph(PhFilePlus, 'PostAdd');
export const PrintOutlined = glyph(PhPrinter, 'PrintOutlined');
export const Receipt = glyph(PhReceipt, 'Receipt');
export const ReceiptLong = glyph(PhBasket, 'ReceiptLong');
export const Remove = glyph(PhMinus, 'Remove');
export const RemoveCircleOutline = glyph(PhMinusCircle, 'RemoveCircleOutline');
export const ReplayCircleFilled = glyph(PhArrowCounterClockwise, 'ReplayCircleFilled');
export const RequestQuote = glyph(PhHandCoins, 'RequestQuote');
export const Restore = glyph(PhArrowCounterClockwise, 'Restore');
export const Search = glyph(PhMagnifyingGlass, 'Search');
export const Settings = glyph(PhGear, 'Settings');
export const Share = glyph(PhShareNetwork, 'Share');
export const ShareOutlined = glyph(PhShareNetwork, 'ShareOutlined');
export const Shield = glyph(PhShield, 'Shield');
export const SouthEast = glyph(PhArrowDownRight, 'SouthEast');
export const Star = glyph(PhStar, 'Star');
export const StarBorder = glyph(PhStar, 'StarBorder');
export const Sync = glyph(PhArrowsClockwise, 'Sync');
export const SystemUpdateAlt = glyph(PhDownloadSimple, 'SystemUpdateAlt');
export const TableChart = glyph(PhTable, 'TableChart');
export const TaskAlt = glyph(PhCheckCircle, 'TaskAlt');
export const Timeline = glyph(PhChartLine, 'Timeline');
export const TrendingDown = glyph(PhTrendDown, 'TrendingDown');
export const Tune = glyph(PhSlidersHorizontal, 'Tune');
export const Unarchive = glyph(PhArrowCounterClockwise, 'Unarchive');
export const Upload = glyph(PhUploadSimple, 'Upload');
export const VerifiedUserOutlined = glyph(PhShieldCheck, 'VerifiedUserOutlined');
export const Visibility = glyph(PhEye, 'Visibility');
export const VisibilityOff = glyph(PhEyeSlash, 'VisibilityOff');
export const VisibilityOutlined = glyph(PhEye, 'VisibilityOutlined');
export const WarningAmber = glyph(PhWarning, 'WarningAmber');
export const WavingHand = glyph(PhHandWaving, 'WavingHand');
export const WhatsApp = glyph(PhWhatsappLogo, 'WhatsApp');
export const WifiOff = glyph(PhWifiSlash, 'WifiOff');
