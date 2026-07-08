import {
    PersonAdd as PersonAddIcon,
    ChatBubbleOutline as ChatBubbleOutlineIcon,
    SwapHoriz as SwapHorizIcon,
    WarningAmber as WarningAmberIcon,
    InfoOutlined as InfoOutlinedIcon,
} from '@mui/icons-material';

/** Icon for a notification type, used by both the bell dropdown and the Notifications page. */
export const notifIcon = (type) => {
    switch (type) {
        case 'assignment': return <PersonAddIcon fontSize="small" />;
        case 'comment': return <ChatBubbleOutlineIcon fontSize="small" />;
        case 'status': return <SwapHorizIcon fontSize="small" />;
        case 'due_soon':
        case 'overdue': return <WarningAmberIcon fontSize="small" />;
        default: return <InfoOutlinedIcon fontSize="small" />;
    }
};
