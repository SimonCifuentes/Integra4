import { Stack } from "expo-router";
import { AuthGate, RoleGate } from "@/src/utils/guards";
export default function AdminLayout(){
  return <AuthGate><RoleGate roles={["admin","superadmin"]}><Stack screenOptions={{ headerShown:false }}/></RoleGate></AuthGate>;
}
