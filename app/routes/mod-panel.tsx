import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import type { ChangeEvent, FormEvent } from "react";
import type { Doc } from "../../convex/_generated/dataModel";

export default function ModPanel() {
  const [modKey, setModKey] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [warningReason, setWarningReason] = useState("");
  const [banReason, setBanReason] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  // Mutations
  const modWarnUser = useMutation(api.mod.modWarnUser);
  const modBanUser = useMutation(api.mod.modBanUser);
  const modDeleteProduct = useMutation(api.mod.modDeleteProduct);
  const modDeleteCompany = useMutation(api.mod.modDeleteCompany);

  // Queries
  const searchResults = useQuery(
    api.mod.searchUser,
    isAuthenticated && searchQuery ? { query: searchQuery, modKey } : "skip"
  );

  const userWarnings =
    isAuthenticated && selectedUser
      ? useQuery(api.mod.getUserWarningsForMod, {
          userId: selectedUser as any,
          modKey,
        })
      : null;

  const userCompanies =
    isAuthenticated && selectedUser
      ? useQuery(api.mod.getUserCompanies, {
          userId: selectedUser as any,
          modKey,
        })
      : null;

  const companyProducts =
    isAuthenticated && selectedCompany
      ? useQuery(api.mod.getCompanyProducts, {
          companyId: selectedCompany as any,
          modKey,
        })
      : null;

  const handleLogin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (modKey) {
      setIsAuthenticated(true);
    }
  };

  const handleWarnUser = async () => {
    if (!selectedUser || !warningReason) return;
    try {
      await modWarnUser({
        userId: selectedUser as any,
        reason: warningReason,
        modKey,
      });
      setWarningReason("");
      alert("Warning issued");
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Failed"}`);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser || !banReason) return;
    try {
      await modBanUser({
        userId: selectedUser as any,
        reason: banReason,
        modKey,
      });
      setBanReason("");
      alert("User banned");
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Failed"}`);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      await modDeleteProduct({
        productId: productId as any,
        modKey,
      });
      alert("Product deleted");
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Failed"}`);
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!confirm("Delete this company? This cannot be undone.")) return;
    try {
      await modDeleteCompany({
        companyId: companyId as any,
        modKey,
      });
      alert("Company deleted");
      setSelectedCompany(null);
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Failed"}`);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto mt-20">
          <h1 className="text-2xl font-bold mb-6">Mod Panel</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="password"
              placeholder="Enter mod passkey"
              value={modKey}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setModKey(e.target.value)
              }
            />
            <Button type="submit" className="w-full">
              Login
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Mod Panel</h1>
          <Button
            variant="outline"
            onClick={() => {
              setIsAuthenticated(false);
              setModKey("");
            }}
          >
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Search Users */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-3">Search User</h2>
              <Input
                placeholder="Username or email"
                value={searchQuery}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setSearchQuery(e.target.value)
                }
              />
            </div>

            {searchResults && searchResults.length > 0 && (
              <div className="border rounded-lg p-3 space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map((user: Doc<"users">) => (
                  <button
                    key={user._id}
                    onClick={() => {
                      setSelectedUser(user._id);
                      setSelectedCompany(null);
                      setSelectedProduct(null);
                    }}
                    className={`w-full text-left p-2 rounded text-sm ${
                      selectedUser === user._id
                        ? "bg-blue-600 text-white"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    <div className="font-medium">
                      {user.username || user.name}
                    </div>
                    <div className="text-xs opacity-75">{user.email}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User Actions */}
          <div className="space-y-4">
            {selectedUser && (
              <>
                <div>
                  <h2 className="text-xl font-semibold mb-3">User Actions</h2>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">
                        Warning Reason
                      </label>
                      <Input
                        placeholder="Reason for warning"
                        value={warningReason}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          setWarningReason(e.target.value)
                        }
                      />
                      <Button
                        size="sm"
                        className="w-full mt-2"
                        onClick={handleWarnUser}
                      >
                        Issue Warning
                      </Button>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Ban Reason</label>
                      <Input
                        placeholder="Reason for ban"
                        value={banReason}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          setBanReason(e.target.value)
                        }
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full mt-2"
                        onClick={handleBanUser}
                      >
                        Ban User
                      </Button>
                    </div>
                  </div>
                </div>

                {/* User Warnings */}
                {userWarnings && userWarnings.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Warnings</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {userWarnings.map((warning: Doc<"userWarnings">) => (
                        <div
                          key={warning._id}
                          className="text-xs bg-muted p-2 rounded"
                        >
                          <div className="font-medium">{warning.reason}</div>
                          <div className="opacity-75">
                            {new Date(warning.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Companies & Products */}
          <div className="space-y-4">
            {selectedUser && userCompanies && (
              <div>
                <h2 className="text-xl font-semibold mb-3">Companies</h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {userCompanies.length > 0 ? (
                    userCompanies.map((company: Doc<"companies">) => (
                      <button
                        key={company._id}
                        onClick={() => {
                          setSelectedCompany(company._id);
                          setSelectedProduct(null);
                        }}
                        className={`w-full text-left p-2 rounded text-sm ${
                          selectedCompany === company._id
                            ? "bg-blue-600 text-white"
                            : "bg-muted hover:bg-muted/80"
                        }`}
                      >
                        <div className="font-medium">{company.name}</div>
                        <div className="text-xs opacity-75">
                          {company.ticker}
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No companies
                    </p>
                  )}
                </div>
              </div>
            )}

            {selectedCompany && companyProducts && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold">Products</h3>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteCompany(selectedCompany)}
                  >
                    Delete Company
                  </Button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {companyProducts.length > 0 ? (
                    companyProducts.map((product: Doc<"products">) => (
                      <div
                        key={product._id}
                        className="flex justify-between items-start p-2 rounded bg-muted text-sm"
                      >
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-xs opacity-75">
                            ${product.price.toFixed(2)}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteProduct(product._id)}
                        >
                          Delete
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No products</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
